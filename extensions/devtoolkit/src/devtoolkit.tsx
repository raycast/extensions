import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  Clipboard,
  showToast,
} from "@raycast/api";
import { useState } from "react";

import { Base64Mode, convertBase64 } from "./base64";
import { CronParseResult, parseCronExpression } from "./cronParser";
import {
  HashResult,
  formatHashesForClipboard,
  generateHashes,
} from "./hashGenerator";
import { formatJson, validateJson } from "./jsonTool";
import { QuoteStyle, RecordDelimiter, formatRecords } from "./recordFormatter";
import {
  UuidOutputSeparator,
  formatUuidBatch,
  generateUuidV7Batch,
  normalizeUuidCount,
} from "./uuidGenerator";

type Base64FormValues = {
  input: string;
  mode: Base64Mode;
};

type Base64Result = {
  input: string;
  mode: Base64Mode;
  output: string;
};

type RecordFormatterFormValues = {
  input: string;
  splitBy?: RecordDelimiter;
  joinWith?: RecordDelimiter;
  quoteStyle?: QuoteStyle;
  trimRecords?: boolean;
  removeDuplicates?: boolean;
};

type RecordFormatterResult = {
  input: string;
  output: string;
};

type HashGeneratorFormValues = {
  input: string;
};

type HashGeneratorResult = {
  input: string;
  hashes: HashResult[];
};

type UuidGeneratorFormValues = {
  count?: string;
  separator?: UuidOutputSeparator;
};

type UuidGeneratorResult = {
  count: number;
  separator: UuidOutputSeparator;
  uuids: string[];
  output: string;
};

type CronParserFormValues = {
  expression: string;
};

type JsonToolMode = "validate" | "format";

type JsonToolFormValues = {
  input: string;
  mode?: JsonToolMode;
};

type JsonToolResult = {
  input: string;
  mode: JsonToolMode;
  valid: boolean;
  output?: string;
  error?: string;
};

const defaultInputSeparator: RecordDelimiter = "new-line";
const defaultOutputSeparator: RecordDelimiter = "comma";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search dev utilities">
      <List.Item
        icon={Icon.Code}
        title="Base64 Encode / Decode"
        subtitle="Convert UTF-8 text to and from Base64"
        actions={
          <ActionPanel>
            <Action.Push title="Open Utility" target={<Base64Utility />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Text}
        title="Record Formatter"
        subtitle="Split, quote, dedupe, and rejoin records"
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Utility"
              target={<RecordFormatterUtility />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Fingerprint}
        title="Hash Generator"
        subtitle="Generate MD5, SHA-1, and SHA-2 hashes"
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Utility"
              target={<HashGeneratorUtility />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Key}
        title="UUID Generator"
        subtitle="Generate UUIDv7 identifiers"
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Utility"
              target={<UuidGeneratorUtility />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Clock}
        title="Cron Job Parser"
        subtitle="Explain cron expressions"
        actions={
          <ActionPanel>
            <Action.Push title="Open Utility" target={<CronParserUtility />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Document}
        title="JSON Validator and Beautifier"
        subtitle="Validate or format JSON"
        actions={
          <ActionPanel>
            <Action.Push title="Open Utility" target={<JsonToolUtility />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function Base64Utility() {
  const [result, setResult] = useState<Base64Result>();

  async function handleSubmit(values: Base64FormValues) {
    const input = values.input.trim();

    if (!input) {
      showToast({ style: Toast.Style.Failure, title: "Enter text to convert" });
      return;
    }

    try {
      const output = convertBase64(input, values.mode);
      setResult({ input, mode: values.mode, output });
      await Clipboard.copy(output);
      showToast({ style: Toast.Style.Success, title: "Converted and copied" });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not convert Base64",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }

  if (result) {
    return (
      <Base64ResultDetail
        result={result}
        onReset={() => setResult(undefined)}
      />
    );
  }

  return (
    <Form
      navigationTitle="Base64 Encode / Decode"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Convert"
            icon={Icon.ArrowRight}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode" defaultValue="encode">
        <Form.Dropdown.Item value="encode" title="Encode" />
        <Form.Dropdown.Item value="decode" title="Decode" />
      </Form.Dropdown>
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Paste text or Base64 here"
      />
    </Form>
  );
}

function Base64ResultDetail({
  result,
  onReset,
}: {
  result: Base64Result;
  onReset: () => void;
}) {
  return (
    <Detail
      navigationTitle={
        result.mode === "encode" ? "Base64 Encoded" : "Base64 Decoded"
      }
      markdown={resultMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={result.output} />
          <Action.Paste title="Paste Output" content={result.output} />
          <Action
            title="Convert Another Value"
            icon={Icon.ArrowClockwise}
            onAction={onReset}
          />
        </ActionPanel>
      }
    />
  );
}

function resultMarkdown(result: Base64Result): string {
  const title = result.mode === "encode" ? "Encoded Output" : "Decoded Output";

  return `# ${title}

\`\`\`text
${result.output}
\`\`\`

## Input

\`\`\`text
${result.input}
\`\`\``;
}

function RecordFormatterUtility() {
  const [result, setResult] = useState<RecordFormatterResult>();

  async function handleSubmit(values: RecordFormatterFormValues) {
    const input = values.input.trim();

    if (!input) {
      showToast({
        style: Toast.Style.Failure,
        title: "Enter records to format",
      });
      return;
    }

    const options = normalizeRecordFormatterValues(values, input);
    const output = formatRecords(options);

    if (!output) {
      showToast({ style: Toast.Style.Failure, title: "No records found" });
      return;
    }

    try {
      await Clipboard.copy(output);
      setResult({ input, output });
      showToast({ style: Toast.Style.Success, title: "Formatted and copied" });
    } catch (error) {
      setResult({ input, output });
      showToast({
        style: Toast.Style.Failure,
        title: "Formatted, but could not copy",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }

  if (result) {
    return (
      <RecordFormatterResultDetail
        result={result}
        onReset={() => setResult(undefined)}
      />
    );
  }

  return (
    <Form
      navigationTitle="Record Formatter"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Format and Copy"
            icon={Icon.Clipboard}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="How it works"
        text="Input Separator reads your pasted records. Output Separator writes the formatted result. Press Command-Enter to format and copy."
      />
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Paste records here"
      />
      <Form.Dropdown
        id="splitBy"
        title="Input Separator"
        info="Reads your pasted text by splitting it at this separator."
        defaultValue={defaultInputSeparator}
      >
        <Form.Dropdown.Item value="comma" title="Comma (,)" />
        <Form.Dropdown.Item value="space" title="Space" />
        <Form.Dropdown.Item value="semicolon" title="Semicolon (;)" />
        <Form.Dropdown.Item value="new-line" title="New Line" />
        <Form.Dropdown.Item value="vertical-bar" title="Vertical Bar (|)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="joinWith"
        title="Output Separator"
        info="Writes the formatted records using this separator."
        defaultValue={defaultOutputSeparator}
      >
        <Form.Dropdown.Item value="comma" title="Comma (,)" />
        <Form.Dropdown.Item value="space" title="Space" />
        <Form.Dropdown.Item value="semicolon" title="Semicolon (;)" />
        <Form.Dropdown.Item value="new-line" title="New Line" />
        <Form.Dropdown.Item value="vertical-bar" title="Vertical Bar (|)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="quoteStyle"
        title="Quote Records"
        info="Wraps each output record with no quotes, double quotes, or single quotes."
        defaultValue="none"
      >
        <Form.Dropdown.Item value="none" title="No Quotes" />
        <Form.Dropdown.Item value="double" title="Double Quotes" />
        <Form.Dropdown.Item value="single" title="Single Quotes" />
      </Form.Dropdown>
      <Form.Checkbox
        id="trimRecords"
        label="Trim Records"
        info="Removes leading and trailing whitespace from each record."
        defaultValue
      />
      <Form.Checkbox
        id="removeDuplicates"
        label="Remove Duplicates"
        info="Keeps only the first occurrence of each record."
      />
    </Form>
  );
}

function normalizeRecordFormatterValues(
  values: RecordFormatterFormValues,
  input: string,
) {
  return {
    input,
    splitBy: values.splitBy ?? defaultInputSeparator,
    joinWith: values.joinWith ?? defaultOutputSeparator,
    quoteStyle: values.quoteStyle ?? "none",
    trimRecords: values.trimRecords ?? true,
    removeDuplicates: values.removeDuplicates ?? false,
  };
}

function RecordFormatterResultDetail({
  result,
  onReset,
}: {
  result: RecordFormatterResult;
  onReset: () => void;
}) {
  return (
    <Detail
      navigationTitle="Formatted Records"
      markdown={recordFormatterResultMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={result.output} />
          <Action.Paste title="Paste Output" content={result.output} />
          <Action
            title="Format Another Value"
            icon={Icon.ArrowClockwise}
            onAction={onReset}
          />
        </ActionPanel>
      }
    />
  );
}

function recordFormatterResultMarkdown(result: RecordFormatterResult): string {
  return `# Formatted Output

\`\`\`text
${result.output}
\`\`\`

## Input

\`\`\`text
${result.input}
\`\`\``;
}

function HashGeneratorUtility() {
  const [result, setResult] = useState<HashGeneratorResult>();

  function handleSubmit(values: HashGeneratorFormValues) {
    const input = values.input;

    if (!input) {
      showToast({
        style: Toast.Style.Failure,
        title: "Enter text to hash",
      });
      return;
    }

    setResult({ input, hashes: generateHashes(input) });
    showToast({ style: Toast.Style.Success, title: "Hashes generated" });
  }

  if (result) {
    return (
      <HashGeneratorResultDetail
        result={result}
        onReset={() => setResult(undefined)}
      />
    );
  }

  return (
    <Form
      navigationTitle="Hash Generator"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Hashes"
            icon={Icon.Fingerprint}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input Text"
        placeholder="Enter text to hash"
      />
    </Form>
  );
}

function HashGeneratorResultDetail({
  result,
  onReset,
}: {
  result: HashGeneratorResult;
  onReset: () => void;
}) {
  const clipboardContent = formatHashesForClipboard(result.hashes);

  return (
    <Detail
      navigationTitle="Generated Hashes"
      markdown={hashGeneratorResultMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy All Hashes"
            content={clipboardContent}
          />
          <ActionPanel.Section title="Copy Individual Hash">
            {result.hashes.map((hash) => (
              <Action.CopyToClipboard
                key={hash.algorithm}
                title={`Copy ${hash.algorithm}`}
                content={hash.value}
              />
            ))}
          </ActionPanel.Section>
          <Action
            title="Hash Another Value"
            icon={Icon.ArrowClockwise}
            onAction={onReset}
          />
        </ActionPanel>
      }
    />
  );
}

function hashGeneratorResultMarkdown(result: HashGeneratorResult): string {
  const hashMarkdown = result.hashes
    .map(
      ({ algorithm, value }) =>
        `## ${algorithm}\n\n\`\`\`text\n${value}\n\`\`\``,
    )
    .join("\n\n");

  return `# Generated Hashes

${hashMarkdown}

## Input

\`\`\`text
${result.input}
\`\`\``;
}

function UuidGeneratorUtility() {
  const [result, setResult] = useState<UuidGeneratorResult>();

  async function handleSubmit(values: UuidGeneratorFormValues) {
    const count = normalizeUuidCount(Number(values.count ?? 1));
    const separator = values.separator ?? "new-line";
    const uuids = generateUuidV7Batch(count);
    const output = formatUuidBatch(uuids, separator);

    try {
      await Clipboard.copy(output);
      setResult({ count, separator, uuids, output });
      showToast({
        style: Toast.Style.Success,
        title: "UUIDs generated and copied",
      });
    } catch (error) {
      setResult({ count, separator, uuids, output });
      showToast({
        style: Toast.Style.Failure,
        title: "UUIDs generated, but could not copy",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }

  if (result) {
    return (
      <UuidGeneratorResultDetail
        result={result}
        onRegenerate={() =>
          handleSubmit({
            count: String(result.count),
            separator: result.separator,
          })
        }
        onReset={() => setResult(undefined)}
      />
    );
  }

  return (
    <Form
      navigationTitle="UUID Generator"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate and Copy"
            icon={Icon.Key}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="count"
        title="Count"
        placeholder="1"
        defaultValue="1"
        info="Generates between 1 and 100 UUIDv7 values."
      />
      <Form.Dropdown
        id="separator"
        title="Output Separator"
        defaultValue="new-line"
        info="Chooses how multiple UUIDs are separated in the copied output."
      >
        <Form.Dropdown.Item value="new-line" title="New Line" />
        <Form.Dropdown.Item value="comma" title="Comma (,)" />
      </Form.Dropdown>
    </Form>
  );
}

function UuidGeneratorResultDetail({
  result,
  onRegenerate,
  onReset,
}: {
  result: UuidGeneratorResult;
  onRegenerate: () => void;
  onReset: () => void;
}) {
  return (
    <Detail
      navigationTitle="Generated UUIDv7"
      markdown={uuidGeneratorResultMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy UUIDs" content={result.output} />
          <Action.Paste title="Paste UUIDs" content={result.output} />
          <Action
            title="Regenerate"
            icon={Icon.ArrowClockwise}
            onAction={onRegenerate}
          />
          <Action title="Change Settings" icon={Icon.Gear} onAction={onReset} />
        </ActionPanel>
      }
    />
  );
}

function uuidGeneratorResultMarkdown(result: UuidGeneratorResult): string {
  return `# Generated UUIDv7

\`\`\`text
${result.output}
\`\`\``;
}

function CronParserUtility() {
  const [result, setResult] = useState<CronParseResult>();

  function handleSubmit(values: CronParserFormValues) {
    try {
      const parsed = parseCronExpression(values.expression);
      setResult(parsed);
      showToast({
        style: Toast.Style.Success,
        title: "Cron expression parsed",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not parse cron expression",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }

  if (result) {
    return (
      <CronParserResultDetail
        result={result}
        onReset={() => setResult(undefined)}
      />
    );
  }

  return (
    <Form
      navigationTitle="Cron Job Parser"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Parse Expression"
            icon={Icon.Clock}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="expression"
        title="Cron Expression"
        placeholder="0 2 3 4 5"
        info="Supports 5, 6, and 7 field cron expressions plus nicknames like @daily."
      />
      <Form.Description
        title="Format"
        text="minute (0-59)    hour (0-23)    day of the month (1-31)    month (1-12)    day of the week (0-6)"
      />
      <Form.Description
        title="Examples"
        text="0 0 * * * = every day at midnight&#10;*/15 * * * * = every 15 minutes&#10;0 9-17 * * 1-5 = every hour from 9 AM to 5 PM, Monday to Friday"
      />
    </Form>
  );
}

function CronParserResultDetail({
  result,
  onReset,
}: {
  result: CronParseResult;
  onReset: () => void;
}) {
  return (
    <Detail
      navigationTitle="Cron Job Parser"
      markdown={cronParserResultMarkdown(result)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Explanation"
            content={result.explanation}
          />
          <Action.CopyToClipboard
            title="Copy Expression"
            content={result.expression}
          />
          <Action
            title="Parse Another Expression"
            icon={Icon.ArrowClockwise}
            onAction={onReset}
          />
        </ActionPanel>
      }
    />
  );
}

function cronParserResultMarkdown(result: CronParseResult): string {
  const fields = result.fields
    .map(
      ({ label, value, description }) =>
        `| ${label} | \`${value}\` | ${description} |`,
    )
    .join("\n");

  return `# Cron Job Parser

## Explanation

${result.explanation}

## Field Breakdown

| Field | Value | Allowed Values |
| --- | --- | --- |
${fields}

## Quick Reference

\`\`\`text
* * * * *
minute hour day-of-month month day-of-week
\`\`\`

| Character | Meaning |
| --- | --- |
| \`*\` | any value |
| \`,\` | value list |
| \`-\` | range |
| \`/\` | step values |
| \`?\` | no specific value |
| \`L\` | last valid value |
| \`W\` | nearest weekday |
| \`#\` | nth weekday of the month |

## Common Examples

| Expression | Meaning |
| --- | --- |
| \`0 0 * * *\` | Every day at midnight |
| \`*/15 * * * *\` | Every 15 minutes |
| \`0 9-17 * * 1-5\` | Every hour from 9 AM to 5 PM, Monday to Friday |
| \`@daily\` | Every day at midnight |
`;
}

function JsonToolUtility() {
  const [result, setResult] = useState<JsonToolResult>();

  async function handleSubmit(values: JsonToolFormValues) {
    const input = values.input.trim();
    const mode = values.mode ?? "validate";

    if (!input) {
      showToast({ style: Toast.Style.Failure, title: "Enter JSON" });
      return;
    }

    if (mode === "validate") {
      const validation = validateJson(input);
      setResult({
        input,
        mode,
        valid: validation.valid,
        error: validation.valid ? undefined : validation.error,
      });
      showToast({
        style: validation.valid ? Toast.Style.Success : Toast.Style.Failure,
        title: validation.valid ? "Valid JSON" : "Invalid JSON",
      });
      return;
    }

    try {
      const output = formatJson(input);
      await Clipboard.copy(output);
      setResult({ input, mode, valid: true, output });
      showToast({ style: Toast.Style.Success, title: "Formatted and copied" });
    } catch (error) {
      setResult({
        input,
        mode,
        valid: false,
        error: error instanceof Error ? error.message : "Invalid JSON",
      });
      showToast({ style: Toast.Style.Failure, title: "Invalid JSON" });
    }
  }

  if (result) {
    return (
      <JsonToolResultDetail
        result={result}
        onReset={() => setResult(undefined)}
      />
    );
  }

  return (
    <Form
      navigationTitle="JSON Validator and Beautifier"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run"
            icon={Icon.Document}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mode"
        title="Action"
        defaultValue="validate"
        info="Validate checks syntax. Format validates and pretty-prints JSON with two-space indentation."
      >
        <Form.Dropdown.Item value="validate" title="Validate JSON" />
        <Form.Dropdown.Item value="format" title="Format JSON" />
      </Form.Dropdown>
      <Form.TextArea
        id="input"
        title="JSON Input"
        placeholder='{"service":"api","enabled":true}'
      />
    </Form>
  );
}

function JsonToolResultDetail({
  result,
  onReset,
}: {
  result: JsonToolResult;
  onReset: () => void;
}) {
  return (
    <Detail
      navigationTitle="JSON Result"
      markdown={jsonToolResultMarkdown(result)}
      actions={
        <ActionPanel>
          {result.output ? (
            <>
              <Action.CopyToClipboard
                title="Copy Formatted JSON"
                content={result.output}
              />
              <Action.Paste
                title="Paste Formatted JSON"
                content={result.output}
              />
            </>
          ) : null}
          <Action
            title="Check Another JSON"
            icon={Icon.ArrowClockwise}
            onAction={onReset}
          />
        </ActionPanel>
      }
    />
  );
}

function jsonToolResultMarkdown(result: JsonToolResult): string {
  if (!result.valid) {
    return `# Invalid JSON

${result.error ?? "Could not parse JSON."}

## Input

\`\`\`json
${result.input}
\`\`\``;
  }

  if (result.output) {
    return `# Formatted JSON

\`\`\`json
${result.output}
\`\`\``;
  }

  return `# Valid JSON

The input is valid JSON.

## Input

\`\`\`json
${result.input}
\`\`\``;
}
