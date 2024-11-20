import { List, ActionPanel, Action, Icon, Clipboard, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import commandsRaw from "./commands.json";
import { Command, CommandGroup } from "./types";
import { searchKeywordInCommandGroups, formatCommandForClipboard } from "./utils";

export default function CommandSearch() {
  const commandGroups = commandsRaw as CommandGroup[];

  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState(commandGroups);

  useEffect(() => {
    setFilteredList(searchKeywordInCommandGroups(searchText, commandGroups));
  }, [searchText]);

  return (
    <List
      onSearchTextChange={setSearchText}
      navigationTitle="Search Vim Commands"
      searchBarPlaceholder="Learn new command by searching it here."
    >
      {filteredList.map((commandGroup: CommandGroup) => {
        const key = commandGroup.key;
        const commands = commandGroup.commands;
        return (
          <List.Section key={key} title={key[0].toUpperCase() + key.slice(1)}>
            {commands.map((command: Command) => {
              return (
                <List.Item
                  key={command.kbd}
                  title={command.kbd}
                  subtitle={command.text[0].toUpperCase() + command.text.slice(1)}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Copy Command"
                        icon={Icon.Clipboard}
                        onAction={async () => {
                          const formattedCommand = formatCommandForClipboard(command.kbd);
                          await Clipboard.copy(formattedCommand);
                          await showToast({
                            title: "Copied to Clipboard",
                            message: formattedCommand,
                          });
                        }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
