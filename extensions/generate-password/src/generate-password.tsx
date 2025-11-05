import { ActionPanel, List, Action, showToast, Toast, getPreferenceValues, Icon, LocalStorage } from "@raycast/api";
import crypto from "crypto";
import { useState, useEffect, useRef, ReactElement } from "react";

interface PasswordConfig {
  length: number;
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeDigits: boolean;
  includeSymbols: boolean;
}

interface Preferences {
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeDigits: boolean;
  includeSymbols: boolean;
  passwordLength: number;
  passwordCount: number;
}

function generatePassword(config: PasswordConfig): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{};:,.<>/?";

  let charset = "";
  if (config.includeLowercase) charset += lower;
  if (config.includeUppercase) charset += upper;
  if (config.includeDigits) charset += digits;
  if (config.includeSymbols) charset += symbols;

  if (charset.length === 0) {
    throw new Error("At least one character type must be selected");
  }

  const bytes = crypto.randomBytes(config.length);
  let out = "";
  for (let i = 0; i < config.length; i++) {
    const idx = bytes[i] % charset.length;
    out += charset[idx];
  }
  return out;
}

function getPasswordComposition(password: string): string {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()\-_=+[\]{};:,.<>/?]/.test(password);

  const parts: string[] = [];
  if (hasLower) parts.push("lower");
  if (hasUpper) parts.push("upper");
  if (hasDigit) parts.push("digits");
  if (hasSymbol) parts.push("symbols");

  return parts.join(", ");
}

export default function Command() {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const prefs = getPreferenceValues<{
      includeLowercase?: boolean;
      includeUppercase?: boolean;
      includeDigits?: boolean;
      includeSymbols?: boolean;
      passwordLength?: string | number;
      passwordCount?: string | number;
    }>();
    return {
      includeLowercase: prefs.includeLowercase ?? true,
      includeUppercase: prefs.includeUppercase ?? true,
      includeDigits: prefs.includeDigits ?? true,
      includeSymbols: prefs.includeSymbols ?? true,
      passwordLength:
        typeof prefs.passwordLength === "string"
          ? parseInt(prefs.passwordLength, 10) || 16
          : (prefs.passwordLength ?? 16),
      passwordCount:
        typeof prefs.passwordCount === "string" ? parseInt(prefs.passwordCount, 10) || 5 : (prefs.passwordCount ?? 5),
    };
  });

  const isInitialLoad = useRef(true);

  // Load saved preferences from LocalStorage on mount
  useEffect(() => {
    LocalStorage.getItem("userPreferences").then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved as string) as Partial<Preferences>;
          setPreferences((prev) => ({ ...prev, ...parsed }));
        } catch {
          // Ignore parse errors
        }
      }
      isInitialLoad.current = false;
    });
  }, []);

  // Save preferences to LocalStorage whenever they change (but not on initial load)
  useEffect(() => {
    if (!isInitialLoad.current) {
      LocalStorage.setItem("userPreferences", JSON.stringify(preferences));
    }
  }, [preferences]);

  const [passwords, setPasswords] = useState<string[]>([]);

  const generatePasswords = (count: number, config: PasswordConfig) => {
    try {
      const newPasswords: string[] = [];
      for (let i = 0; i < count; i++) {
        newPasswords.push(generatePassword(config));
      }
      return newPasswords;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Generation Error",
        message: error instanceof Error ? error.message : "Failed to generate password",
      });
      return [];
    }
  };

  useEffect(() => {
    const config: PasswordConfig = {
      length: preferences.passwordLength,
      includeLowercase: preferences.includeLowercase,
      includeUppercase: preferences.includeUppercase,
      includeDigits: preferences.includeDigits,
      includeSymbols: preferences.includeSymbols,
    };
    const newPasswords = generatePasswords(preferences.passwordCount, config);
    setPasswords(newPasswords);
  }, [preferences]);

  const handleRegenerateAll = () => {
    const config: PasswordConfig = {
      length: preferences.passwordLength,
      includeLowercase: preferences.includeLowercase,
      includeUppercase: preferences.includeUppercase,
      includeDigits: preferences.includeDigits,
      includeSymbols: preferences.includeSymbols,
    };
    const newPasswords = generatePasswords(preferences.passwordCount, config);
    setPasswords(newPasswords);
    showToast({
      style: Toast.Style.Success,
      title: "Regenerated all passwords",
    });
  };

  const handleTogglePreference = (key: keyof Preferences) => {
    if (key === "passwordLength" || key === "passwordCount") return;
    const newValue = !preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: newValue }));
  };

  const getConfigActions = () => (
    <>
      <Action
        title={preferences.includeLowercase ? "Disable Lowercase" : "Enable Lowercase"}
        icon={preferences.includeLowercase ? Icon.CheckCircle : Icon.Circle}
        onAction={() => handleTogglePreference("includeLowercase")}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
      />
      <Action
        title={preferences.includeUppercase ? "Disable Uppercase" : "Enable Uppercase"}
        icon={preferences.includeUppercase ? Icon.CheckCircle : Icon.Circle}
        onAction={() => handleTogglePreference("includeUppercase")}
        shortcut={{ modifiers: ["cmd"], key: "u" }}
      />
      <Action
        title={preferences.includeDigits ? "Disable Digits" : "Enable Digits"}
        icon={preferences.includeDigits ? Icon.CheckCircle : Icon.Circle}
        onAction={() => handleTogglePreference("includeDigits")}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
      <Action
        title={preferences.includeSymbols ? "Disable Symbols" : "Enable Symbols"}
        icon={preferences.includeSymbols ? Icon.CheckCircle : Icon.Circle}
        onAction={() => handleTogglePreference("includeSymbols")}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
      <Action
        title="Increase Length"
        icon={Icon.ArrowRight}
        onAction={() => {
          if (preferences.passwordLength < 128) {
            setPreferences((prev) => ({ ...prev, passwordLength: prev.passwordLength + 1 }));
          }
        }}
        shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
      />
      <Action
        title="Decrease Length"
        icon={Icon.ArrowLeft}
        onAction={() => {
          if (preferences.passwordLength > 1) {
            setPreferences((prev) => ({ ...prev, passwordLength: prev.passwordLength - 1 }));
          }
        }}
        shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
      />
      <Action
        title="Increase Count"
        icon={Icon.ArrowUp}
        onAction={() => {
          if (preferences.passwordCount < 50) {
            setPreferences((prev) => ({ ...prev, passwordCount: prev.passwordCount + 1 }));
          }
        }}
        shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
      />
      <Action
        title="Decrease Count"
        icon={Icon.ArrowDown}
        onAction={() => {
          if (preferences.passwordCount > 1) {
            setPreferences((prev) => ({ ...prev, passwordCount: prev.passwordCount - 1 }));
          }
        }}
        shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
      />
    </>
  );

  const listItems: ReactElement[] = [];

  // Generated passwords - main feature
  passwords.forEach((password, index) => {
    const composition = getPasswordComposition(password);

    listItems.push(
      <List.Item
        key={`password-${index}`}
        icon={Icon.Key}
        title={password}
        subtitle={`${composition} • Length: ${password.length}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Password"
              content={password}
              icon={Icon.Clipboard}
              onCopy={() =>
                showToast({
                  style: Toast.Style.Success,
                  title: "Copied to clipboard",
                })
              }
            />
            <Action
              title="Regenerate All Passwords"
              icon={Icon.ArrowClockwise}
              onAction={handleRegenerateAll}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            {getConfigActions()}
          </ActionPanel>
        }
      />,
    );
  });

  return (
    <List searchBarPlaceholder="Generated passwords..." filtering={false}>
      {listItems}
    </List>
  );
}
