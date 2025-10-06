import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import crypto from "crypto";

const DEFAULT_LENGTH = 32;

const CHARACTER_SETS = {
  balanced: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_!@#$%^&*",
  alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  numeric: "0123456789",
  hex: "0123456789abcdef",
  base64: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
} as const;

type KeyType = keyof typeof CHARACTER_SETS;

interface FormValues {
  keyType: KeyType;
  length: string;
}

function generateSecret(length: number, characters: string): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("Length must be a positive integer.");
  }

  if (characters.length === 0) {
    throw new Error("Character set must not be empty.");
  }

  let secret = "";
  const maxValidByte = Math.floor(256 / characters.length) * characters.length - 1;

  while (secret.length < length) {
    const bytesNeeded = length - secret.length;
    const randomBytes = crypto.randomBytes(bytesNeeded);

    for (const byte of randomBytes) {
      if (byte > maxValidByte) {
        continue;
      }

      secret += characters[byte % characters.length];

      if (secret.length === length) {
        break;
      }
    }
  }

  return secret;
}

export default function Command() {
  const [generatedKey, setGeneratedKey] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (isGenerating) {
      return;
    }

    const { keyType } = values;
    const trimmedLength = values.length?.trim();
    const parsedLength = trimmedLength ? Number.parseInt(trimmedLength, 10) : DEFAULT_LENGTH;

    if (!Number.isInteger(parsedLength) || parsedLength <= 0 || parsedLength > 256) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid length",
        message: "Enter an integer between 1 and 256 characters.",
      });
      return;
    }

    try {
      setIsGenerating(true);
      const characterSet = CHARACTER_SETS[keyType];
      const secret = generateSecret(parsedLength, characterSet);

      await Clipboard.copy(secret);
      setGeneratedKey(secret);

      await showToast({
        style: Toast.Style.Success,
        title: "Secret copied to clipboard",
        message: `${parsedLength} characters using ${formatKeyTypeTitle(keyType)}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate key",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isGenerating ? "Generating…" : "Generate & Copy"}
            onSubmit={handleSubmit}
            icon={Icon.Gear}
          />
          {generatedKey ? (
            <Action.CopyToClipboard title="Copy Last Key" content={generatedKey} icon={Icon.Clipboard} />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="keyType" title="Key Type" defaultValue="balanced">
        <Form.Dropdown.Item value="balanced" title="Secure (letters, numbers, symbols)" />
        <Form.Dropdown.Item value="alphanumeric" title="Alphanumeric" />
        <Form.Dropdown.Item value="numeric" title="Numeric" />
        <Form.Dropdown.Item value="hex" title="Hexadecimal" />
        <Form.Dropdown.Item value="base64" title="Base64" />
      </Form.Dropdown>
      <Form.TextField
        id="length"
        title="Length"
        placeholder={String(DEFAULT_LENGTH)}
        defaultValue={String(DEFAULT_LENGTH)}
      />
      {generatedKey ? <Form.Description title="Last Generated Key" text={generatedKey} /> : null}
    </Form>
  );
}

function formatKeyTypeTitle(keyType: KeyType) {
  switch (keyType) {
    case "balanced":
      return "secure";
    case "alphanumeric":
      return "alphanumeric";
    case "numeric":
      return "numeric";
    case "hex":
      return "hex";
    case "base64":
      return "base64";
    default:
      return keyType;
  }
}
