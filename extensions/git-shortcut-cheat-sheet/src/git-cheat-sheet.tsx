import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { getGitAliasSearchText, gitAliases } from "./git-aliases";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search Oh My Zsh git aliases or commands">
      {gitAliases.map((entry, index) => (
        <List.Item
          key={`${entry.alias}-${index}`}
          icon={Icon.Terminal}
          title={entry.alias}
          subtitle={entry.command}
          keywords={[entry.command, ...getGitAliasSearchText(entry).split(/\s+/)]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Alias" content={entry.alias} />
              <Action.CopyToClipboard title="Copy Command" content={entry.command} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
