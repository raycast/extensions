import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import commandsRaw from "./commands.json";

type Command = {
  kbd: string;
  text: string;
};

type CommandGroup = {
  key: string;
  commands: Command[];
};

export default function CommandSearch() {
  const commandGroups = commandsRaw as CommandGroup[];

  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState(commandGroups);

  useEffect(() => {
    const filteredCommandGroups: CommandGroup[] = [];

    const notMatchedCommandGroups: CommandGroup[] = [];

    commandGroups.forEach((group: CommandGroup) => {
      if (group.key.toLowerCase().includes(searchText.toLowerCase())) {
        filteredCommandGroups.push(group);
      } else {
        notMatchedCommandGroups.push(group);
      }
    });

    notMatchedCommandGroups.forEach((group: CommandGroup) => {
      const list: Command[] = [];
      group.commands.forEach((item: Command) => {
        if (item.text.toLowerCase().includes(searchText.toLowerCase())) {
          list.push(item);
        } else if (item.kbd.toLowerCase().includes(searchText.toLowerCase())) {
          list.push(item);
        }
      });

      filteredCommandGroups.push({ key: group.key, commands: list });
    });
    setFilteredList(filteredCommandGroups);
  }, [searchText]);

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search vim commands"
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
                  title={command.text[0].toUpperCase() + command.text.slice(1)}
                  subtitle={command.kbd}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
