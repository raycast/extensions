import { ActionPanel, Action, Icon, List, Clipboard, showToast } from "@raycast/api";
import data from "./commands.json";
import { CommandGroup } from "./types";
import { useEffect, useState } from "react";
import { formatter, searchCommandByKeyword } from "./utils";

export default function Command() {
  const rawData = data as unknown as CommandGroup[];
  const [searchText, setSearchText] = useState("");
  const [displayData, setDisplayData] = useState(rawData);
  useEffect(() => {
    const result = searchCommandByKeyword(searchText, rawData);
    setDisplayData(result || []);
  }, [searchText]);

  useEffect(() => {
    console.log(displayData);
  }, [displayData]);
  return (
    <List
      onSearchTextChange={setSearchText}
      navigationTitle="Search Tmux Commands"
      searchBarPlaceholder="Search Commands..."
    >
      {displayData.map((group) => {
        const key = group.key;
        const commands = group.commands;
        return (
          <List.Section key={key} title={key[0].toUpperCase() + key.slice(1)}>
            {commands.map((command) => {
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
                          const formatted = formatter(command.kbd);
                          await Clipboard.copy(formatted);
                          await showToast({
                            title: "Copied to Clipboard",
                            message: formatted,
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
