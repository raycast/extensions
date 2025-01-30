import { ActionPanel, Form, Action, showToast, Toast, List } from "@raycast/api";
import * as chrono from "chrono-node";
import { DateTime } from "luxon";
import { useState } from "react";

interface TimeData {
  natural: string;
  unixSeconds: string;
  unixMillis: string;
  iso: string;
  local: string;
  utc: string;
}

export default function TimeConverter() {
  const [result, setResult] = useState<TimeData | null>(null);

  const parseInput = (input: string) => {
    if (/^\d+$/.test(input)) {
      const numeric = parseInt(input);
      const isMillis = input.length === 13;
      const dt = isMillis ? DateTime.fromMillis(numeric) : DateTime.fromSeconds(numeric);

      if (!dt.isValid) throw new Error("Invalid UNIX timestamp");
      return dt;
    }
    const parsedDate = chrono.parseDate(input);
    if (!parsedDate) throw new Error("Unrecognized time format");
    return DateTime.fromJSDate(parsedDate);
  };

  const handleSubmit = (values: { input: string }) => {
    try {
      const date = parseInput(values.input);

      if (!date.isValid) {
        throw new Error("Invalid date format");
      }
      setResult({
        natural: values.input,
        unixSeconds: Math.floor(date.toMillis() / 1000).toString(),
        unixMillis: date.toMillis().toString(),
        iso: date.toISO() || "",
        local: date.toLocaleString(DateTime.DATETIME_FULL),
        utc: date.toUTC().toString(),
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid time format",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setResult(null);
    }
  };

  if (result) {
    return (
      <List>
        <List.Section title="Time Conversions">
          <List.Item
            title="Input"
            accessories={[{ text: result.natural }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.natural} />
              </ActionPanel>
            }
          />
          <List.Item
            title="UNIX Seconds"
            accessories={[{ text: result.unixSeconds }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.unixSeconds} />
              </ActionPanel>
            }
          />
          <List.Item
            title="UNIX Milliseconds"
            accessories={[{ text: result.unixMillis }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.unixMillis} />
              </ActionPanel>
            }
          />
          <List.Item
            title="ISO 8601"
            accessories={[{ text: result.iso }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.iso} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Local Time"
            accessories={[{ text: result.local }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.local} />
              </ActionPanel>
            }
          />
          <List.Item
            title="UTC Time"
            accessories={[{ text: result.utc }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.utc} />
              </ActionPanel>
            }
          />
        </List.Section>

        <List.Section title="Actions">
          <List.Item
            title="Convert Again"
            accessories={[{ text: "⌘R" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Reset Search"
                  onAction={() => setResult(null)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert Time" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="input" title="Time Input" placeholder="Enter time (UNIX, ISO, natural language...)" />
    </Form>
  );
}
