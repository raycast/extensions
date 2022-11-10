import { List } from "@raycast/api";
import { useState } from "react";
import { categoriesURLS, TvModelFlag } from "./interface/tvmodel";
import { getChannels } from "./api/getChannels";
import { CategoryDropdown } from "./components/categoryDropdown";
import { SearchListItem } from "./components/searchListItem";

export default function Command() {
  const [channels, setTv] = useState<TvModelFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const onCategoryTypeChange = (categoryValue: string) => {
    setIsLoading(true);
    getChannels(categoryValue)
      .then((iptvs) => {
        setTv(iptvs);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search IPTV channels..."
      throttle
      searchBarAccessory={<CategoryDropdown categories={categoriesURLS} onCategoryTypeChange={onCategoryTypeChange} />}
    >
      <List.Section title="Results" subtitle={channels.length + ""}>
        {channels.map((channel) => (
          <SearchListItem key={channel.tvModel.name + channel.tvModel.tvg.id} channel={channel} />
        ))}
      </List.Section>
    </List>
  );
}
