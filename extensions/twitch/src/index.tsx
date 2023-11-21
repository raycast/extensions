import { Image, List } from "@raycast/api";
import { useState } from "react";
import { action } from "./helpers/action";
import useLiveChannels from "./helpers/useLiveChannels";

export default function main() {
  const [query, setQuery] = useState<string>("");

  const { data: items, isLoading } = useLiveChannels(query);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for a streamer..."
      onSearchTextChange={(text) => setQuery(text)}
    >
      {items.map((item) => {
        return (
          <List.Item
            key={item.id}
            icon={{ source: item.thumbnail_url, mask: Image.Mask.Circle }}
            id={item.id}
            title={item.title}
            subtitle={item.display_name}
            actions={action(item.broadcaster_login, item.is_live || false)}
          />
        );
      })}
    </List>
  );
}
