import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { default as alias } from "./alias.json";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");

  const onSearchTextChange = (text: string) => {
    setSearchText(text);
  };

  return (
    <List onSearchTextChange={onSearchTextChange}>
      {alias.map((a: { alias: string; command: string }) => {
        if (searchText !== "" && !a.alias.includes(searchText) && !a.command.includes(searchText)) {
          return null;
        }
        return (
          <List.Item
            key={a.alias}
            title={a.alias}
            subtitle={a.command}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Paste">
                  <Action.Paste title="Paste Alias" content={a.alias} />
                  <Action.Paste title="Paste Command" content={a.command} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard title="Copy Alias" content={a.alias} />
                  <Action.CopyToClipboard title="Copy Command" content={a.command} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
