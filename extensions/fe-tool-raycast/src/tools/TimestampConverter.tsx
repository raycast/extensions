import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

export default function TimestampConverter() {
  const [input, setInput] = useState("");

  const convertedTimestamp = convertTimestamp(input || new Date().getTime().toString());

  return (
    <List onSearchTextChange={setInput} searchBarPlaceholder="Enter a timestamp or date...">
      {convertedTimestamp ? (
        <List.Section title="Converted Timestamp">
          <List.Item
            title="Timestamp"
            subtitle={convertedTimestamp.timestamp.toString()}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Timestamp" content={convertedTimestamp.timestamp.toString()} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Date"
            subtitle={convertedTimestamp.date}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Date" content={convertedTimestamp.date.toString()} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <List.EmptyView title="Enter a valid timestamp or date" />
      )}
    </List>
  );
}

function convertTimestamp(input: string) {
  try {
    const timestamp = /^\d+$/.test(input) ? parseInt(input, 10) : new Date(input).getTime();
    const date = formatDate(new Date(timestamp));
    return { timestamp, date };
  } catch (error) {
    return null;
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份从 0 开始，需要加 1
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
