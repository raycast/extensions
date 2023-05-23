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
    Clipboard.copy(password, { transient: true });
    showHUD("Password has been copied to the clipboard 😄");
  };

  return (
    <List isLoading={passwords.length === 0}>
      <List.Section title="Results" subtitle={`${passwords.length}`}>
        {passwords.map((p, index) => {
          const words = p.plaintext.split(" ");
          return (
            <List.Item
              key={index}
              icon={Icon.Key}
              title={{ value: p.password, tooltip: p.plaintext }}
              accessories={[
                { icon: Icon.Eye },
                ...words.map((word) => ({
                  tag: { value: word },
                })),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy Password"
                    icon={Icon.CopyClipboard}
                    onAction={() => handleCopyPassword(p.password)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
