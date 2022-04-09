import { List } from "@raycast/api";
import { useState } from "react";
import { getTorrents } from "./api/topTorrents";
import { SearchListItem } from "./components/searchListItem";
import { Torrent } from "./interface/torrent";

export default function Command() {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const onSearchTextChange = (searchText: string) => {
    if (searchText.length > 3) {
      setIsLoading(true);
      getTorrents("search/" + searchText + "/1/").then((torrents) => {
        setTorrents(torrents);
        setIsLoading(false);
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for torrent..."
      throttle
      onSearchTextChange={onSearchTextChange}
    >
      <List.Section title="Results" subtitle={torrents.length + ""}>
        {torrents.map((torrent: Torrent) => (
          <SearchListItem key={torrent.title} searchResult={torrent} />
        ))}
      </List.Section>
    </List>
  );
}
