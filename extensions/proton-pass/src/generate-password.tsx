import { List, ActionPanel, Action, Icon, showToast, Toast, Clipboard, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { generatePassword, passwordScore } from "./lib/pass-cli";
import { Preferences, PasswordScore, PassCliError, PassCliErrorType } from "./lib/types";
import { getPasswordStrengthLabel, getPasswordStrengthIcon, maskPassword } from "./lib/utils";
import { renderErrorView } from "./lib/error-views";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [password, setPassword] = useState<string>("");
  const [score, setScore] = useState<PasswordScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<PassCliErrorType | null>(null);

  const generate = useCallback(
    async (type?: "random" | "passphrase") => {
      setIsLoading(true);
      try {
        const passwordType = type || (preferences.defaultPasswordType as "random" | "passphrase") || "random";
        const options = {
          type: passwordType as "random" | "passphrase",
          length: passwordType === "random" ? parseInt(preferences.defaultPasswordLength || "20") : undefined,
          words: passwordType === "passphrase" ? 4 : undefined,
        };

        const newPassword = await generatePassword(options);
        setPassword(newPassword);

        const newScore = await passwordScore(newPassword);
        setScore(newScore);
        setError(null);
      } catch (e: unknown) {
        if (e instanceof PassCliError) {
          setError(e.type);
        } else {
          setError("unknown");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [preferences],
  );

  useEffect(() => {
    generate();
  }, [generate]);

  const errorView = renderErrorView(error, () => generate(), "Generate Password");
  if (errorView) return errorView;

  async function copyPassword() {
    await Clipboard.copy(password, { transient: preferences.copyPasswordTransient ?? true });
    showToast({ style: Toast.Style.Success, title: "Password Copied" });
  }

  return (
    <List isLoading={isLoading}>
      {password && (
        <>
          <List.Item
            icon={Icon.Key}
            title="Generated Password"
            subtitle={showPassword ? password : maskPassword(password)}
            accessories={
              score
                ? [
                    {
                      icon: getPasswordStrengthIcon(score.passwordScore),
                      text: getPasswordStrengthLabel(score.passwordScore),
                      tooltip: score.penalties ? score.penalties.join(", ") : undefined,
                    },
                  ]
                : []
            }
            actions={
              <ActionPanel>
                <Action title="Copy Password" icon={Icon.Clipboard} onAction={copyPassword} />
                <Action
                  title={showPassword ? "Hide Password" : "Show Password"}
                  icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
                  onAction={() => setShowPassword(!showPassword)}
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                />
                <ActionPanel.Section title="Generate New">
                  <Action
                    title="Generate Random Password"
                    icon={Icon.Shuffle}
                    onAction={() => generate("random")}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Generate Passphrase"
                    icon={Icon.Text}
                    onAction={() => generate("passphrase")}
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
          {score && (
            <List.Item
              icon={getPasswordStrengthIcon(score.passwordScore)}
              title="Password Strength"
              subtitle={getPasswordStrengthLabel(score.passwordScore)}
              accessories={[
                { text: `${Math.round(score.numericScore)}` },
                ...(score.penalties && score.penalties.length > 0
                  ? [{ text: `${score.penalties.length} ${score.penalties.length === 1 ? "penalty" : "penalties"}` }]
                  : []),
              ]}
            />
          )}
        </>
      )}
    </List>
  );
}
