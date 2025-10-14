import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import {
  CommandItem,
  getCommandsByCategory,
  searchCommands,
} from "../../constants/commands-data";
import CommandDetail from "./detail";

export default function BrowseCommandsCheatsheet() {
  const [searchText, setSearchText] = useState("");
  const commandsByCategory = getCommandsByCategory();
  const filteredCommands = searchText ? searchCommands(searchText) : [];

  const getIconForCommand = (command: CommandItem): Icon => {
    if (command.category === "Commands") {
      return Icon.Terminal;
    } else if (command.category === "Keyboard Shortcuts") {
      return Icon.Keyboard;
    } else if (command.category === "CLI Flags") {
      return Icon.Flag;
    } else if (command.category === "Special Keywords") {
      return Icon.Stars;
    } else {
      return Icon.Code;
    }
  };

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Browse Claude Code cheat sheet..."
      filtering={false}
    >
      {searchText ? (
        <List.Section title={`Search Results (${filteredCommands.length})`}>
          {filteredCommands.map((command) => (
            <List.Item
              key={command.id}
              title={command.name}
              subtitle={command.description}
              icon={getIconForCommand(command)}
              accessories={[{ text: command.category }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    target={<CommandDetail command={command} />}
                    icon={Icon.Eye}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        commandsByCategory.map(({ category, commands }) => (
          <List.Section
            key={category}
            title={`${category} (${commands.length})`}
          >
            {commands.map((command) => (
              <List.Item
                key={command.id}
                title={command.name}
                subtitle={command.description}
                icon={getIconForCommand(command)}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      target={<CommandDetail command={command} />}
                      icon={Icon.Eye}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
