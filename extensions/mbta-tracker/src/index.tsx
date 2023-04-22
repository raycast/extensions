import { useState } from "react";
import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(`https://api-v3.mbta.com/routes`, {
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchText={searchText} throttle>
      <List.Section title="Subway">
        {(data.data || [])
          .filter((item) => item.attributes.type == 0 || item.attributes.type == 1)
          .map((item) => (
            <List.Item
              key={item.id}
              title={item.attributes.long_name}
              icon={{ source: Icon.CircleFilled, tintColor: item.attributes.color }}
              accessoryTitle={item.attributes.description}
            />
          ))}
      </List.Section>
      <List.Section title="Bus">
        {(data.data || [])
          .filter((item) => item.attributes.type == 3)
          .map((item) => (
            <List.Item
              key={item.id}
              title={item.attributes.short_name}
              icon={{ source: Icon.CircleFilled, tintColor: item.attributes.color }}
              accessoryTitle={item.attributes.description}
            />
          ))}
      </List.Section>
      <List.Section title="Commuter Rail">
        {(data.data || [])
          .filter((item) => item.attributes.type == 2)
          .map((item) => (
            <List.Item
              key={item.id}
              title={item.attributes.long_name}
              icon={{ source: Icon.CircleFilled, tintColor: item.attributes.color }}
              accessoryTitle={item.attributes.description}
            />
          ))}
      </List.Section>
    </List>
  );
}
