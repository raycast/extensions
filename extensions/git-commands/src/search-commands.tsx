import { Action, ActionPanel, List } from "@raycast/api";
import { getData, typeColor, showDescription } from "./utils";
import CommandDetail from "./command-detail";

export default function Command() {
  const aliases = getData();

  return (
    <List searchBarPlaceholder="Search for commands or aliases ...">
      {aliases.map((alias) => {
        return (
          <List.Item
            key={alias.name}
            title={{ value: alias.command, tooltip: alias.command }}
            subtitle={showDescription ? { value: alias.description, tooltip: alias.description } : undefined}
            accessories={[{ tag: { value: alias.name, color: typeColor(alias.type) }, tooltip: alias.command }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Alias">
                  <Action.CopyToClipboard title="Copy Alias" content={alias.name} />
                  <Action.CopyToClipboard title="Paste Alias" content={alias.name} />
                </ActionPanel.Section>

                <ActionPanel.Section title="Command">
                  <Action.CopyToClipboard
                    title="Copy Command"
                    content={alias.command}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Paste
                    title="Paste Command"
                    content={alias.command}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Reference">
                  <Action.Push
                    title="See Description"
                    target={<CommandDetail alias={alias} />}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.OpenInBrowser
                    title="Open Git Plugin"
                    url="https://github.com/ohmyzsh/ohmyzsh/blob/master/plugins/git/README.md"
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
