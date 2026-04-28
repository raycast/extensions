import { Form, ActionPanel, Action, showToast, Toast, getSelectedText } from "@raycast/api";
import { useState, useEffect } from "react";

const MORSE_CODE_DICT: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  "0": "-----",
  ",": "--..--",
  ".": ".-.-.-",
  "?": "..--..",
  "/": "-..-.",
  "-": "-....-",
  "(": "-.--.",
  ")": "-.--.-",
  " ": "/",
  "@": ".--.-.",
  "'": ".----.",
  '"': ".-..-.",
  "!": "-.-.--",
  $: "...-..-",
  "&": ".-...",
  "+": ".-.-.",
  "=": "-...-",
  ":": "---...",
  ";": "-.-.-.",
  _: "..--.-",
};

const REVERSE_DICT: Record<string, string> = Object.entries(MORSE_CODE_DICT).reduce(
  (acc, [key, value]) => {
    acc[value] = key;
    return acc;
  },
  {} as Record<string, string>,
);

function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .map((char) => MORSE_CODE_DICT[char] || char)
    .join(" ");
}

function morseToText(morse: string): string {
  return morse
    .split(" ")
    .map((code) => REVERSE_DICT[code] || (code === "/" ? " " : code))
    .join("");
}

function isMorseCode(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  for (const char of trimmed) {
    if (!".- /".includes(char)) return false;
  }
  return true;
}

export default function Command() {
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<"toMorse" | "toText">("toMorse");

  useEffect(() => {
    async function fetchSelectedText() {
      try {
        const selectedText = await getSelectedText();
        if (selectedText && selectedText.trim().length > 0) {
          setInputText(selectedText);
          if (isMorseCode(selectedText)) {
            setMode("toText");
          } else {
            setMode("toMorse");
          }
        }
      } catch {
        // Silently fail if no text is selected or if we don't have permission
      }
    }
    fetchSelectedText();
  }, []);

  const result = mode === "toMorse" ? textToMorse(inputText) : morseToText(inputText);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Result"
            content={result}
            onCopy={() => showToast(Toast.Style.Success, "Copied to clipboard!")}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode}
        onChange={(newValue) => setMode(newValue as "toMorse" | "toText")}
      >
        <Form.Dropdown.Item value="toMorse" title="Text to Morse Code" />
        <Form.Dropdown.Item value="toText" title="Morse Code to Text" />
      </Form.Dropdown>

      <Form.TextArea
        id="input"
        title="Input"
        placeholder={
          mode === "toMorse"
            ? "Type text here..."
            : "Type morse code here (use spaces between letters and / for spaces)..."
        }
        value={inputText}
        onChange={setInputText}
      />

      <Form.Separator />

      <Form.TextArea
        id="output"
        title="Result"
        value={result}
        onChange={() => {}} // Read-only
      />
    </Form>
  );
}
