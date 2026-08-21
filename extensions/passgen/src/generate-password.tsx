import { Action, ActionPanel, Clipboard, Form, Icon, Keyboard, showHUD, showToast, Toast } from "@raycast/api";
import { randomInt } from "crypto";
import { useState } from "react";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const DEFAULT_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";

const MIN_LENGTH = 4;
const MAX_LENGTH = 128;

interface FormValues {
  length: string;
  useLowercase: boolean;
  useUppercase: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  symbols: string;
}

function buildPools(values: FormValues): string[] {
  const pools: string[] = [];
  if (values.useLowercase) pools.push(LOWERCASE);
  if (values.useUppercase) pools.push(UPPERCASE);
  if (values.useDigits) pools.push(DIGITS);
  if (values.useSymbols) {
    const symbols = [...new Set(values.symbols.replace(/\s/g, ""))].join("");
    if (symbols.length > 0) pools.push(symbols);
  }
  return pools;
}

function generatePassword(length: number, pools: string[]): string {
  const all = pools.join("");
  // Guarantee at least one character from every selected set
  const chars = pools.map((pool) => pool[randomInt(pool.length)]);
  while (chars.length < length) {
    chars.push(all[randomInt(all.length)]);
  }
  // Fisher–Yates shuffle so guaranteed characters are not always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, length).join("");
}

function validate(values: FormValues): { length: number; pools: string[] } | string {
  const length = Number(values.length);
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    return `Length must be a number between ${MIN_LENGTH} and ${MAX_LENGTH}`;
  }
  const pools = buildPools(values);
  if (pools.length === 0) {
    return "Select at least one character set";
  }
  if (pools.length > length) {
    return `Length ${length} is too short for ${pools.length} selected character sets`;
  }
  return { length, pools };
}

export default function Command() {
  const [password, setPassword] = useState<string>("");
  const [lengthError, setLengthError] = useState<string | undefined>();

  async function run(values: FormValues, action: "copy" | "paste" | "show") {
    const result = validate(values);
    if (typeof result === "string") {
      await showToast({ style: Toast.Style.Failure, title: result });
      return;
    }
    const newPassword = generatePassword(result.length, result.pools);
    setPassword(newPassword);
    if (action === "copy") {
      await Clipboard.copy(newPassword, { concealed: true });
      await showHUD("Password copied to clipboard");
    } else if (action === "paste") {
      await Clipboard.paste(newPassword);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate and Copy"
            icon={Icon.Clipboard}
            onSubmit={(values: FormValues) => run(values, "copy")}
          />
          <Action.SubmitForm
            title="Generate and Paste"
            icon={Icon.Text}
            onSubmit={(values: FormValues) => run(values, "paste")}
          />
          <Action.SubmitForm
            title="Generate (Show Only)"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onSubmit={(values: FormValues) => run(values, "show")}
          />
          {password.length > 0 && (
            <Action.CopyToClipboard
              title="Copy Shown Password"
              content={password}
              concealed
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="length"
        title="Length"
        placeholder="16"
        defaultValue="16"
        storeValue
        error={lengthError}
        onChange={(value) => {
          const n = Number(value);
          if (value && (!Number.isInteger(n) || n < MIN_LENGTH || n > MAX_LENGTH)) {
            setLengthError(`${MIN_LENGTH}–${MAX_LENGTH}`);
          } else {
            setLengthError(undefined);
          }
        }}
      />
      <Form.Checkbox id="useLowercase" label="Lowercase (a–z)" defaultValue={true} storeValue />
      <Form.Checkbox id="useUppercase" label="Uppercase (A–Z)" defaultValue={true} storeValue />
      <Form.Checkbox id="useDigits" label="Digits (0–9)" defaultValue={true} storeValue />
      <Form.Checkbox id="useSymbols" label="Symbols" defaultValue={true} storeValue />
      <Form.TextField
        id="symbols"
        title="Symbol Set"
        info="Which special characters may appear in the password"
        defaultValue={DEFAULT_SYMBOLS}
        storeValue
      />
      {password.length > 0 && <Form.Separator />}
      {password.length > 0 && <Form.Description title="Password" text={password} />}
    </Form>
  );
}
