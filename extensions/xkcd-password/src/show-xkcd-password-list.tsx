import { List, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import wordList from "./wordlist.json";

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function generateTwoDigits(): string {
  return String(Math.floor(Math.random() * 100)).padStart(2, "0");
}

function generateXkcdPassword(wordCount: number = 3, separator: string = "-"): string {
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    const word = capitalizeWord(wordList[randomIndex]);
    words.push(word);
  }
  const digits = generateTwoDigits();
  return [...words, digits].join(separator);
}

function generatePasswords(count: number): string[] {
  return Array.from({ length: count }, () => generateXkcdPassword());
}

export default function Command() {
  const passwords = generatePasswords(10);

  return (
    <List>
      {passwords.map((password, index) => (
        <List.Item
          key={index}
          title={password}
          actions={
            <ActionPanel>
              <Action
                title="Copy Password"
                onAction={async () => {
                  await Clipboard.copy(password);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Password Copied",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
