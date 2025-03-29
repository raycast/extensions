import { ActionPanel, Action, showToast, List, Toast, Clipboard, LaunchProps } from "@raycast/api";
import crypto from "crypto";
import { useState, useCallback } from "react";

function generatePassword(length: number = 8): string {
  // Validate length input
  if (!length || length < 1) return "Please enter a valid length";
  const constrainedLength = Math.min(length, 32);

  const num = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" + num + special;

  return Array.from(crypto.randomBytes(constrainedLength))
    .map((byte) => chars[byte % chars.length])
    .join("");
}

interface passwordLenArg {
  length: string;
}

export default function PasswordGeneratorCommand(props: LaunchProps<{ arguments: passwordLenArg }>) {
  const propLen =
    props.arguments.length && !isNaN(parseInt(props.arguments.length, 10)) ? parseInt(props.arguments.length, 10) : 8;
  const [passwords, setPasswords] = useState<string[]>(() =>
    Array.from({ length: 5 }, () => generatePassword(propLen)),
  );
  const [passwordLength, setPasswordLength] = useState<number>(8);

  const regeneratePasswords = useCallback(
    (len?: number) => {
      const newLength = len ?? passwordLength;
      const constrainedLength = Math.max(1, Math.min(newLength, 32));

      try {
        const newPasswords = Array.from({ length: 5 }, () => generatePassword(constrainedLength));
        setPasswords(newPasswords);
        setPasswordLength(constrainedLength);

        showToast({
          title: "Passwords Refreshed",
          message: `Generated ${newPasswords.length} passwords of length ${constrainedLength}`,
          style: Toast.Style.Success,
        });
      } catch (error) {
        showToast({
          title: "Password Generation Failed",
          message: error instanceof Error ? error.message : "Unknown error",
          style: Toast.Style.Failure,
        });
      }
    },
    [passwordLength],
  );

  const copyToClipboard = useCallback((pass: string) => {
    Clipboard.copy(pass);
    showToast({
      title: "Copied to Clipboard",
      message: pass,
      style: Toast.Style.Success,
    });
  }, []);

  const handleSearchTextChange = useCallback(
    (text: string) => {
      const parsedLength = parseInt(text, 10);

      if (isNaN(parsedLength)) {
        showToast({
          title: "Invalid Input",
          message: "Please enter a valid number",
          style: Toast.Style.Failure,
        });
        return;
      }

      regeneratePasswords(parsedLength);
    },
    [regeneratePasswords],
  );

  return (
    <List searchBarPlaceholder="Enter password length (1-32)" onSearchTextChange={handleSearchTextChange}>
      {passwords.map((pass, index) => (
        <List.Section key={`${pass}-${index}`} title={`Password ${index + 1}`}>
          <List.Item
            title={pass}
            icon="key-round.svg"
            actions={
              <ActionPanel>
                <Action title="Copy" onAction={() => copyToClipboard(pass)} icon="copy.svg" />
                <Action title="Refresh" onAction={() => regeneratePasswords()} icon="refresh-cw.svg" />
              </ActionPanel>
            }
          />
        </List.Section>
      ))}
    </List>
  );
}
