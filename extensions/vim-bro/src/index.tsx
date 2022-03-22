import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import commands from "./commands.json";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, setFilteredList] = useState(commands);

  useEffect(() => {
    const filteredCommands: any = {};

    const notMatchedTitles: any = {};

    Object.entries(commands).forEach(([key, value]) => {
      if (key.toLowerCase().includes(searchText.toLowerCase())) {
        filteredCommands[key] = value;
      } else {
        notMatchedTitles[key] = value;
      }
    });

    Object.entries(notMatchedTitles).forEach(([key, value]) => {
      const list: any = [];
      value.forEach((item: any) => {
        const title = String(item["#text"]).toLowerCase();
        if (title.toLowerCase().includes(searchText.toLowerCase())) {
          list.push(item);
        }
      });

      filteredCommands[key] = list;
    });
    setFilteredList(filteredCommands);
  }, [searchText]);

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search vim commands"
      searchBarPlaceholder="Learn new command by searching it here."
    >
      {Object.entries(filteredList).map(([key, value]) => {
        return (
          <List.Section title={key[0].toUpperCase() + key.slice(1)}>
            {value.map((command) => {
              return (
                <List.Item
                  title={command["#text"][0].toUpperCase() + command["#text"].slice(1)}
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
