import { Action, ActionPanel, List } from "@raycast/api";
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
  return result;
}

export default function Command() {
  return (
    <List>
      {generateNPasswords(numSets).map((pw, i) => (
        <List.Item
          key={`pw-${i}`}
          icon="copy.png"
          title={pw}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy to Clipboard" content={pw} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
