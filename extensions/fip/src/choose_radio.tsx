import { Action, ActionPanel, closeMainWindow, List, showHUD, launchCommand, LaunchType } from "@raycast/api";
import { exec } from "child_process";
import React, { useEffect, useState } from "react";
import { RADIOS } from "./constants";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(RADIOS);

  useEffect(() => {
    filterList(RADIOS.filter((item) => item.title.toLowerCase().includes(searchText)));
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Radios"
      searchBarPlaceholder="Search Radios"
    >
      {filteredList.map((item) => (
        <List.Item
          key={item.title}
          title={item.title}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                onAction={async () => {
                  await launchCommand({ name: "start", type: LaunchType.UserInitiated, context: { url: item.url } });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
