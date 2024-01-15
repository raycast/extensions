import { Action, ActionPanel, List } from "@raycast/api";
import { getData, typeColor, showDescription } from "./utils";

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
                <Action.CopyToClipboard title="Copy Alias" content={alias.name} />
                <Action.CopyToClipboard title="Copy Command" content={alias.command} />
                {showDescription && <Action.CopyToClipboard title="Copy Description" content={alias.description} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
