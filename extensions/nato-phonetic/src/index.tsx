import { exec } from "node:child_process";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  type LaunchProps,
  showHUD,
} from "@raycast/api";

function speak(text: string): void {
  // Escape quotes for shell safety
  const escaped = text.replace(/"/g, '\\"');
  exec(`say "${escaped}"`, (error) => {
    if (error) {
      showHUD("Failed to speak");
    }
  });
}

const NATO_ALPHABET: Record<string, string> = {
  A: "Alpha",
  B: "Bravo",
  C: "Charlie",
  D: "Delta",
  E: "Echo",
  F: "Foxtrot",
  G: "Golf",
  H: "Hotel",
  I: "India",
  J: "Juliet",
  K: "Kilo",
  L: "Lima",
  M: "Mike",
  N: "November",
  O: "Oscar",
  P: "Papa",
  Q: "Quebec",
  R: "Romeo",
  S: "Sierra",
  T: "Tango",
  U: "Uniform",
  V: "Victor",
  W: "Whiskey",
  X: "X-ray",
  Y: "Yankee",
  Z: "Zulu",
  "0": "Zero",
  "1": "One",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
};

const NATO_PRONUNCIATION: Record<string, string> = {
  A: "AL-FAH",
  B: "BRAH-VOH",
  C: "CHAR-LEE",
  D: "DELL-TAH",
  E: "ECK-OH",
  F: "FOKS-TROT",
  G: "GOLF",
  H: "HOH-TEL",
  I: "IN-DEE-AH",
  J: "JEW-LEE-ETT",
  K: "KEY-LOH",
  L: "LEE-MAH",
  M: "MIKE",
  N: "NO-VEM-BER",
  O: "OSS-CAH",
  P: "PAH-PAH",
  Q: "KEH-BECK",
  R: "ROW-ME-OH",
  S: "SEE-AIR-RAH",
  T: "TANG-GO",
  U: "YOU-NEE-FORM",
  V: "VIK-TAH",
  W: "WISS-KEY",
  X: "ECKS-RAY",
  Y: "YANG-KEY",
  Z: "ZOO-LOO",
  "0": "ZEE-RO",
  "1": "WUN",
  "2": "TOO",
  "3": "TREE",
  "4": "FOW-ER",
  "5": "FIFE",
  "6": "SIX",
  "7": "SEV-EN",
  "8": "AIT",
  "9": "NIN-ER",
};

function convertText(text: string, mapping: Record<string, string>): string {
  const words = text.split(/\s+/);
  const convertedWords = words.map((word) => {
    const letters = word.toUpperCase().split("");
    const converted = letters.map((char) => mapping[char]).filter(Boolean);
    return converted.join(" ");
  });
  return convertedWords.filter((w) => w.length > 0).join("  ·  ");
}

interface Arguments {
  text?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const text = props.arguments?.text || props.fallbackText || "";
  const converted = convertText(text, NATO_ALPHABET);
  const pronunciation = convertText(text, NATO_PRONUNCIATION);

  const markdown = text
    ? `# ${converted}

---

**Pronunciation**

${pronunciation}`
    : `# NATO Phonetic Alphabet

Type text to convert, or use the command with an argument.

| Letter | Code | Pronunciation |
|--------|------|---------------|
| A | Alpha | AL-FAH |
| B | Bravo | BRAH-VOH |
| C | Charlie | CHAR-LEE |
| D | Delta | DELL-TAH |
| E | Echo | ECK-OH |
| F | Foxtrot | FOKS-TROT |
| G | Golf | GOLF |
| H | Hotel | HOH-TEL |
| I | India | IN-DEE-AH |
| J | Juliet | JEW-LEE-ETT |
| K | Kilo | KEY-LOH |
| L | Lima | LEE-MAH |
| M | Mike | MIKE |
| N | November | NO-VEM-BER |
| O | Oscar | OSS-CAH |
| P | Papa | PAH-PAH |
| Q | Quebec | KEH-BECK |
| R | Romeo | ROW-ME-OH |
| S | Sierra | SEE-AIR-RAH |
| T | Tango | TANG-GO |
| U | Uniform | YOU-NEE-FORM |
| V | Victor | VIK-TAH |
| W | Whiskey | WISS-KEY |
| X | X-ray | ECKS-RAY |
| Y | Yankee | YANG-KEY |
| Z | Zulu | ZOO-LOO |
| 0 | Zero | ZEE-RO |
| 1 | One | WUN |
| 2 | Two | TOO |
| 3 | Three | TREE |
| 4 | Four | FOW-ER |
| 5 | Five | FIFE |
| 6 | Six | SIX |
| 7 | Seven | SEV-EN |
| 8 | Eight | AIT |
| 9 | Nine | NIN-ER |
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        text ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Input" text={text} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Characters"
              text={String(text.replace(/\s/g, "").length)}
            />
            <Detail.Metadata.Label
              title="Words"
              text={String(text.split(/\s+/).filter(Boolean).length)}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        text && converted ? (
          <ActionPanel>
            <Action
              title="Copy Phonetic"
              onAction={() => Clipboard.copy(converted)}
            />
            <Action
              title="Speak Phonetic"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => speak(converted)}
            />
            <Action
              title="Copy Pronunciation"
              onAction={() => Clipboard.copy(pronunciation)}
            />
            <Action
              title="Copy All"
              onAction={() =>
                Clipboard.copy(`${text}\n${converted}\n${pronunciation}`)
              }
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
