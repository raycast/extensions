import { useEffect, useState } from "react";
import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";

interface Preferences {
  items: string;
}

interface Location {
  title: string;
  link: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();
  console.log(preferences);
  const { items } = preferences;

  return (
    <List
      filtering={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Locations"
      searchBarPlaceholder="Search your locations"
    >
      {JSON.parse(items).map((item: Location) => {
        return (
          <List.Item
            key={item.title}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.Open title={item.title} target={item.link} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
