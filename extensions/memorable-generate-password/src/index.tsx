import { LaunchProps, Icon, List, Clipboard, Action, ActionPanel, popToRoot, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import generatePassword, { PasswordData } from "./generatePassword";

interface PasswordArguments {
  wordCount: string;
  passwordCount: string;
}

export default function Command(props: LaunchProps<{ arguments: PasswordArguments }>) {
  const { wordCount, passwordCount } = props.arguments;
  if (parseInt(passwordCount) > 1000) {
    popToRoot();
    showToast(Toast.Style.Failure, "Password count cannot be greater than 1000");
  }
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

  const handleCopyPassword = async (password: string) => {
    Clipboard.copy(password, { transient: true });
    await showToast(Toast.Style.Success, "Password has been copied to the clipboard 😄");
    await popToRoot();
  };

  return (
    <List isLoading={passwords.length === 0} isShowingDetail>
      <List.Section title="Results" subtitle={`${passwords.length}`}>
        {passwords.map((p, index) => {
          const words = p.plaintext.split(" ");
          const wordCount = words.length;
          const passwordLength = p.password.length;
          return (
            <List.Item
              key={index}
              icon={Icon.Key}
              title={{ value: p.password, tooltip: p.plaintext }}
              detail={
                <List.Item.Detail
                  markdown={words.map((word) => `\`${word}\``).join("\u00A0\u00A0\u00A0")}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Word Count" text={wordCount.toString()} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Password Length" text={passwordLength.toString()} />
                      <List.Item.Detail.Metadata.Separator />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
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
