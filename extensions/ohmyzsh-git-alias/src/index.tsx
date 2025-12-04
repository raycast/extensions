import { Action, ActionPanel, List } from "@raycast/api";
import { default as alias } from "./alias.json";

export default function Command() {
  return (
    <List>
      {alias.map((a: { alias: string; command: string }) => {
        return (
          <List.Item
            key={a.alias}
            title={a.alias}
            subtitle={a.command}
            keywords={[a.alias, a.command, ...a.command.split(" ")]}
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
