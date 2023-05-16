import { LaunchProps, Icon, List, Clipboard, Action, ActionPanel, showHUD } from "@raycast/api";
import { useState, useEffect } from "react";
import generatePassword, { PasswordData } from "./generatePassword";

interface PasswordArguments {
  wordCount: string;
  passwordCount: string;
}

export default function Command(props: LaunchProps<{ arguments: PasswordArguments }>) {
  const { wordCount, passwordCount } = props.arguments;
  const [passwords, setPasswords] = useState<PasswordData[]>([]);

  const parseNumber = (value: string, defaultValue: number) => {
    const parsedValue = parseInt(value);
    return !isNaN(parsedValue) ? parsedValue : defaultValue;
  };

  useEffect(() => {
    const fetchData = async () => {
      const validWordCount = parseNumber(wordCount, 3);
      const validPasswordCount = parseNumber(passwordCount, 9);

      const passwords = await generatePassword(validWordCount, validPasswordCount);

      setPasswords(passwords);
    };
    fetchData();
  }, [wordCount, passwordCount]);

  const handleCopyPassword = (password: string) => {
    Clipboard.copy(password);
    showHUD("Password has been copied to the clipboard 😄");
  };

  return (
    <List>
      {passwords.map((p, index) => (
        <List.Item
          key={index}
          icon={Icon.Key}
          title={`${p.password}`}
          subtitle={`Strength: ${p.strength}/4`}
          accessories={[{ text: `${p.plaintext}`, icon: Icon.Eye }]}
          actions={
            <ActionPanel title="Copy Password">
              <Action title={`Copy Password: ${p.password}`} onAction={() => handleCopyPassword(p.password)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
