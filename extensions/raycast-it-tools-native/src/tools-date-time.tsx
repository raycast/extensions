import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo, useState } from "react";

type ConvertMode = "auto" | "timestamp_to_date" | "date_to_timestamp";
type DisplayMode = "local" | "utc";

function parseTimestamp(value: string): Date {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error("Timestamp must be an integer");
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    throw new Error("Invalid timestamp");
  }
  const millis = trimmed.length <= 10 ? num * 1000 : num;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid timestamp");
  }
  return date;
}

function parseDateString(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date string");
  }
  return date;
}

function formatDate(date: Date, displayMode: DisplayMode): string {
  if (displayMode === "utc") {
    return date.toUTCString();
  }
  return date.toLocaleString();
}

type DateResolution = {
  date: Date;
  source: string;
  normalizedInput: string;
};

function resolveDate(mode: ConvertMode, input: string): DateResolution {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      date: new Date(),
      source: "Current Time",
      normalizedInput: "(empty)",
    };
  }

  if (mode === "timestamp_to_date") {
    return {
      date: parseTimestamp(trimmed),
      source: "Timestamp",
      normalizedInput: trimmed,
    };
  }

  if (mode === "date_to_timestamp") {
    return {
      date: parseDateString(trimmed),
      source: "Date String",
      normalizedInput: trimmed,
    };
  }

  if (/^-?\d+$/.test(trimmed)) {
    return {
      date: parseTimestamp(trimmed),
      source: "Auto Detected Timestamp",
      normalizedInput: trimmed,
    };
  }

  return {
    date: parseDateString(trimmed),
    source: "Auto Detected Date String",
    normalizedInput: trimmed,
  };
}

function formatAlignedRows(rows: Array<[string, string]>): string {
  const labelWidth = rows.reduce(
    (max, [label]) => Math.max(max, label.length),
    0,
  );
  return rows
    .map(([label, value]) => `${label.padEnd(labelWidth)} : ${value}`)
    .join("\n");
}

function convert(
  mode: ConvertMode,
  input: string,
  displayMode: DisplayMode,
): string {
  const { date, source, normalizedInput } = resolveDate(mode, input);
  const primaryLabel =
    displayMode === "utc" ? "Primary (UTC)" : "Primary (Local)";
  const localWithZone = `${date.toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;

  const rows: Array<[string, string]> = [
    ["Source", source],
    ["Input", normalizedInput],
    [primaryLabel, formatDate(date, displayMode)],
    ["Local Time", localWithZone],
    ["UTC Time", date.toUTCString()],
    ["ISO 8601", date.toISOString()],
    ["Unix Seconds", String(Math.floor(date.getTime() / 1000))],
    ["Unix Milliseconds", String(date.getTime())],
  ];

  return formatAlignedRows(rows);
}

export function ToolsDateTimeView() {
  const [mode, setMode] = useState<ConvertMode>("auto");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("local");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    try {
      return { output: convert(mode, input, displayMode), error: "" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { output: "", error: message };
    }
  }, [displayMode, input, mode]);

  async function pasteFromClipboard() {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
      return;
    }
    setInput(clipboardText.trim());
  }

  async function handleCopy() {
    if (!result.output) {
      await showToast({
        style: Toast.Style.Failure,
        title: result.error || "No output to copy",
      });
      return;
    }
    await Clipboard.copy(result.output);
    await showToast({ style: Toast.Style.Success, title: "Result copied" });
  }

  return (
    <Form
      navigationTitle="Tools: Date Time"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Output">
            <Action
              title="Copy Result"
              icon={Icon.Clipboard}
              onAction={handleCopy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Input">
            <Action
              title="Paste from Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={pasteFromClipboard}
            />
            <Action
              title="Use Current Unix Seconds"
              icon={Icon.Clock}
              onAction={() => setInput(String(Math.floor(Date.now() / 1000)))}
            />
            <Action
              title="Use Current ISO Time"
              icon={Icon.Calendar}
              onAction={() => setInput(new Date().toISOString())}
            />
            <Action
              title="Clear Input"
              icon={Icon.XmarkCircle}
              onAction={() => setInput("")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="Input"
        placeholder="Empty = now; e.g. 1704067200 or 2026-03-04T12:00:00Z"
        value={input}
        onChange={setInput}
      />
      <Form.Dropdown
        id="mode"
        title="Convert Mode"
        value={mode}
        onChange={(value) => setMode(value as ConvertMode)}
      >
        <Form.Dropdown.Item value="auto" title="Auto Detect" />
        <Form.Dropdown.Item
          value="timestamp_to_date"
          title="Timestamp -> Date"
        />
        <Form.Dropdown.Item
          value="date_to_timestamp"
          title="Date -> Timestamp"
        />
      </Form.Dropdown>
      <Form.Dropdown
        id="displayMode"
        title="Display Timezone"
        value={displayMode}
        onChange={(value) => setDisplayMode(value as DisplayMode)}
      >
        <Form.Dropdown.Item value="local" title="Local Time" />
        <Form.Dropdown.Item value="utc" title="UTC" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description
        title="Status"
        text={result.error ? `Error: ${result.error}` : "Ready"}
      />
      <Form.Description
        title="Output"
        text={result.output || "Output appears here"}
      />
    </Form>
  );
}

export default ToolsDateTimeView;
