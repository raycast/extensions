import { useState, useEffect } from "react";
import { ActionPanel, Action, Form } from "@raycast/api";

interface PasswordOptions {
  useUpper: boolean;
  useLower: boolean;
  useDigits: boolean;
  useSymbols: boolean;
}

const DEFAULT_LENGTH = 16;
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

function generatePassword(length: number, options: PasswordOptions): string {
  let charset = "";
  if (options.useUpper) charset += UPPERCASE;
  if (options.useLower) charset += LOWERCASE;
  if (options.useDigits) charset += DIGITS;
  if (options.useSymbols) charset += SYMBOLS;
  if (!charset) charset = LOWERCASE + UPPERCASE + DIGITS;

  // Ensure at least one character from each selected set
  let password = "";
  if (options.useUpper) password += UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)];
  if (options.useLower) password += LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)];
  if (options.useDigits) password += DIGITS[Math.floor(Math.random() * DIGITS.length)];
  if (options.useSymbols) password += SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

  // Fill the rest of the password
  while (password.length < length) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function Command() {
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [password, setPassword] = useState("");

  function regenerate() {
    setPassword(
      generatePassword(length, {
        useUpper,
        useLower,
        useDigits,
        useSymbols,
      })
    );
  }

  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, useUpper, useLower, useDigits, useSymbols]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Generate Password" onAction={regenerate} />
          <Action.CopyToClipboard title="Copy Password" content={password} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="length"
        title="Length"
        value={length.toString()}
        onChange={(v) => setLength(Math.min(Math.max(Number(v.replace(/\D/g, "")) || 0, 5), 64))}
      />
      <Form.Checkbox id="upper" label="Uppercase" value={useUpper} onChange={setUseUpper} />
      <Form.Checkbox id="lower" label="Lowercase" value={useLower} onChange={setUseLower} />
      <Form.Checkbox id="digits" label="Digits" value={useDigits} onChange={setUseDigits} />
      <Form.Checkbox id="symbols" label="Symbols" value={useSymbols} onChange={setUseSymbols} />
      <Form.TextArea
        id="password"
        title="Password"
        value={password}
        onChange={() => {}}
        placeholder="Generated password will appear here"
        enableMarkdown={false}
        autoFocus={false}
      />
    </Form>
  );
}
