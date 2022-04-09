import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { getTorrents } from "./api/topTorrents";
import { CategoryDropdown } from "./components/categoryDropdown";
import { SearchListItem } from "./components/searchListItem";
import { categories } from "./interface/topCategories";
import { Torrent } from "./interface/torrent";

export default function Command() {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTorrents("top-100").then((torrents) => {
      setTorrents(torrents);
      setIsLoading(false);
    });
  }, []);

  const onCategoryTypeChange = (categoryValue: string) => {
    setIsLoading(true);
    getTorrents(categoryValue).then((torrents) => {
      setTorrents(torrents);
      setIsLoading(false);
    });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Top 100 torrents..."
      throttle
      searchBarAccessory={
        <CategoryDropdown
          categories={categories}
          onCategoryTypeChange={onCategoryTypeChange}
        />
      }
    >
      <List.Section title="Results" subtitle={torrents.length + ""}>
        {torrents.map((torrent: Torrent) => (
          <SearchListItem key={torrent.title} searchResult={torrent} />
        ))}
      </List.Section>
    </List>
  );
}
