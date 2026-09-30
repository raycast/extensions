import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { webcrypto } from "crypto";
import { DICTIONARY } from "./dictionary";

const numWordsPerSet = 4;
const numExtra = 3; // +3 for (rand 0-9 number, rand word alignment, rand before/after word)
const numSets = 9;

function randset(): number[] {
  const randomBuffer = new Uint32Array(numWordsPerSet + numExtra);
  webcrypto.getRandomValues(randomBuffer);
  return [...randomBuffer];
}

function generateXKCDPassword(): string {
  const randomness = randset();
  const words: string[] = [];
  const randNumber = randomness[numWordsPerSet + 0] % 10;
  const randNumWordAlign = randomness[numWordsPerSet + 1] % numWordsPerSet;
  for (let i = 0; i < numWordsPerSet; i++) {
    const selectedWord = DICTIONARY[randomness[i] % DICTIONARY.length];
    const word = selectedWord.at(0)!.toUpperCase() + selectedWord.slice(1);
    if (i === randNumWordAlign) {
      const order = randomness[numWordsPerSet + 2] % 2;
      if (order === 0 && i !== 0) {
        words.push(`${randNumber}${word}`);
      } else {
        words.push(`${word}${randNumber}`);
      }
    } else {
      words.push(word);
    }
  }
  return words.join(".");
}

function generateNPasswords(n: number): string[] {
  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(generateXKCDPassword());
  }
  result.sort((a, b) => a.length - b.length);
  return result;
}

export default function Command() {
  const [passwords, setPasswords] = useState<string[]>(() => generateNPasswords(numSets));

  const refreshPasswords = () => {
    setPasswords(generateNPasswords(numSets));
  };

  return (
    <List
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowClockwise}
            title="Generate New Passwords"
            onAction={refreshPasswords}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {passwords.map((pw, i) => (
        <List.Item
          key={`pw-${i}`}
          icon="copy.png"
          title={pw}
          accessories={[{ text: `(${pw.length} characters)`, icon: Icon.Ruler }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy to Clipboard" content={pw} />
              <Action
                icon={Icon.ArrowClockwise}
                title="Generate New Passwords"
                onAction={refreshPasswords}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
