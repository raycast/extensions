import { LaunchProps, List, Clipboard, Action, ActionPanel, showHUD } from "@raycast/api";
import { useState, useEffect } from "react";
import generatePassword from "./generatePassword";

interface PasswordArguments {
  wordCount?: number;
  passwordCount?: number;
}

export default function Command(props: LaunchProps<{ arguments: PasswordArguments }>) {
  console.log(props);
  const { wordCount, passwordCount } = props.arguments;
  const [passwords, setPasswords] = useState<{ title: string; accessoryTitle: string; isCompleted: boolean }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const passwordList = await generatePassword(wordCount || 3, passwordCount || 9);
      setPasswords(
        passwordList.map(({ password, plaintext }) => ({
          title: password,
          accessoryTitle: plaintext,
          isCompleted: false,
        }))
      );
    };
    fetchData();
  }, []);

  const handleCopyPassword = (password: string) => {
    Clipboard.copy(password);
    showHUD("Password has been copied to the clipboard 😄");
  };

  return (
    <List>
      {passwords.map((password, index) => (
        <List.Item
          key={index}
          title={`Password:${password.title}`}
          accessoryTitle={`Plaintext:${password.accessoryTitle}`}
          actions={
            <ActionPanel title="Copy Password">
              <Action title={`Copy Password:${password.title}`} onAction={() => handleCopyPassword(password.title)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
