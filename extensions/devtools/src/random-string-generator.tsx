import { ActionPanel, Action, Form } from "@raycast/api";
import { useState } from "react";
import { randomBytes } from "crypto";

function getRandomBytes(length: number): Uint8Array {
  return new Uint8Array(randomBytes(length));
}

function generateRandomString(length: number, charset: string): string {
  const bytes = getRandomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

export default function Command() {
  const [length, setLength] = useState("16");
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [output, setOutput] = useState("");

  const MIN_LENGTH = 1;
  const MAX_LENGTH = 1000;

  function handleLengthChange(value: string) {
    const num = Number(value.replace(/\D/g, ""));
    if (num >= MIN_LENGTH && num <= MAX_LENGTH) {
      setLength(value);
    }
  }

  function regenerate() {
    let charset = "";
    if (useUpper) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (useLower) charset += "abcdefghijklmnopqrstuvwxyz";
    if (useDigits) charset += "0123456789";
    if (useSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    if (!charset) charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    const result = generateRandomString(Number(length), charset);
    setOutput(result);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Generate" onAction={regenerate} />
          <Action.CopyToClipboard title="Copy to Clipboard" content={output} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="length"
        title="Length"
        value={length}
        onChange={handleLengthChange}
        info={`Length between ${MIN_LENGTH} and ${MAX_LENGTH}`}
      />
      <Form.Checkbox id="upper" label="Uppercase" value={useUpper} onChange={setUseUpper} />
      <Form.Checkbox id="lower" label="Lowercase" value={useLower} onChange={setUseLower} />
      <Form.Checkbox id="digits" label="Digits" value={useDigits} onChange={setUseDigits} />
      <Form.Checkbox id="symbols" label="Symbols" value={useSymbols} onChange={setUseSymbols} />
      <Form.TextArea
        id="output"
        title="Output"
        value={output}
        onChange={() => {}}
        placeholder="Random string will appear here"
        enableMarkdown={false}
        autoFocus={false}
      />
    </Form>
  );
}
