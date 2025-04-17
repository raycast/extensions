import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { generateXkcdPassword } from "./generatePassword";

export default function Command() {
  const [passwords, setPasswords] = useState<string[]>([]);

  useEffect(() => {
    const newPasswords = Array(10)
      .fill(null)
      .map(() => generateXkcdPassword(4, " "));
    setPasswords(newPasswords);
  }, []);

  return (
    <List>
      {passwords.map((password, index) => (
        <List.Item
          key={index}
          title={password}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={password} />
              <Action
                title="Regenerate"
                onAction={() => {
                  const newPasswords = [...passwords];
                  newPasswords[index] = generateXkcdPassword(4, " ");
                  setPasswords(newPasswords);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
