import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Detail,
  PopToRootType,
} from "@raycast/api";
import { useEffect, useState } from "react";

type OutputFormat = "colon" | "hyphen" | "dot" | "plain";

type CommandProps = {
  format: OutputFormat;
  title: string;
  macAddress: string;
};

type CommandArguments = {
  macAddress: string;
};

// const supportedFormats = [
//   "`XX:XX:XX:XX:XX:XX`",
//   "`XX-XX-XX-XX-XX-XX`",
//   "`XXXX.XXXX.XXXX`",
//   "`XXXXXXXXXXXX`",
// ].join(", ");

function sanitizeMacAddress(input: string): string {
  return input.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}

function formatMacAddress(input: string, format: OutputFormat): string {
  const sanitized = sanitizeMacAddress(input);

  if (sanitized.length !== 12) {
    throw new Error("Invalid MAC address");
  }

  switch (format) {
    case "colon":
      return sanitized.match(/.{1,2}/g)?.join(":") ?? sanitized;
    case "hyphen":
      return sanitized.match(/.{1,2}/g)?.join("-") ?? sanitized;
    case "dot":
      return sanitized.match(/.{1,4}/g)?.join(".") ?? sanitized;
    case "plain":
      return sanitized;
  }
}

function buildMarkdown(
  result: string | undefined,
  error: string | undefined,
  title: string,
): string {
  if (error) {
    return `# ${title}

**${error}**

MAC address string must contain exactly 12 hexadecimal characters`;
  }

  if (!result) {
    return `# ${title}

Converting MAC address...`;
  }

  return `# ${title}

\`${result}\`

Press Enter to copy the converted MAC address to your clipboard.`;
}

export function MacAddressCommand({ format, title, macAddress }: CommandProps) {
  const [result, setResult] = useState<string>();
  const [error, setError] = useState<string>();

  async function handleCopyResult(value: string) {
    await Clipboard.copy(value);
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }

  useEffect(() => {
    try {
      const converted = formatMacAddress(macAddress, format);
      setResult(converted);
      setError(undefined);
    } catch {
      setResult(undefined);
      setError("Invalid MAC address");
    }
  }, [format, macAddress]);

  return (
    <Detail
      markdown={buildMarkdown(result, error, title)}
      actions={
        <ActionPanel>
          {result ? (
            <Action
              title="Copy Result"
              onAction={() => handleCopyResult(result)}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export type { CommandArguments, OutputFormat };
