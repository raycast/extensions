import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const unixtimeToUtc = (unixtime: string) => {
    return `${new Date(Number(unixtime)).toUTCString()}`;
  };
  const unixtimeToLocal = (unixtime: string) => {
    return `${new Date(Number(unixtime)).toLocaleString(undefined, { timeZone: timezone })}`;
  };
  const [text, setText] = useState(Date.now().toString());
  const [utc, setUtc] = useState(unixtimeToUtc(text));
  const [local, setLocal] = useState(unixtimeToLocal(text));
  const onSearchTextChange = (value = "") => {
    setText(value);
    setUtc(unixtimeToUtc(value));
    setLocal(unixtimeToLocal(value));
  };
  return (
    <List
      enableFiltering={false}
      searchText={text}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Enter unixtime"
    >
      <List.Item
        title={utc}
        accessories={[{ text: "UTC" }]}
        subtitle={utc}
        actions={
          <ActionPanel title="Copy">
            <Action.CopyToClipboard title="Copy to clipboard" content={utc} />
          </ActionPanel>
        }
      />
      <List.Item
        title={local}
        accessories={[{ text: "Local" }]}
        subtitle={`locale: system, timezone: ${timezone}`}
        actions={
          <ActionPanel title="Copy">
            <Action.CopyToClipboard title="Copy to clipboard" content={local} />
          </ActionPanel>
        }
      />
    </List>
  );
}
