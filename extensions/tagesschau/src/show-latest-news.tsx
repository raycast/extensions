import { List, Icon, Image, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import Parser from "rss-parser";

import Actions from "./components/actions";
import RessortDropdown from "./components/ressortDropdown";
import { rssFeedCollection } from "./rssFeedCollection";

const parser = new Parser();
const rssFeeds = rssFeedCollection();

export default function Command() {
  // Set by the dropdown, which reports its stored (or first) value on mount.
  const [feedUrl, setFeedUrl] = useState<string>();

  const { data: items, isLoading } = usePromise(async (url: string) => (await parser.parseURL(url)).items, [feedUrl!], {
    execute: !!feedUrl,
    failureToastOptions: { title: "Failed to Load News" },
  });

  function onNewsSelectionChange(newValue: string) {
    const selectedFeed = rssFeeds.find((feed) => feed.value === newValue);

    if (selectedFeed) {
      setFeedUrl(selectedFeed.url);
    }
  }

  return (
    <List
      isLoading={isLoading || !feedUrl}
      searchBarPlaceholder="Search news"
      searchBarAccessory={<RessortDropdown rssFeeds={rssFeeds} onNewsSelectionChange={onNewsSelectionChange} />}
    >
      <List.EmptyView icon={Icon.Globe} title="No News Found" description="Try another search term or section." />
      {items?.map((item, index) => (
        <List.Item
          key={item.guid ?? item.link ?? index}
          icon={{ source: Icon.MugSteam, mask: Image.Mask.Circle, tintColor: Color.Blue }}
          title={item.title ?? "Untitled"}
          actions={<Actions item={item} />}
          accessories={item.pubDate ? [{ date: new Date(item.pubDate), tooltip: item.pubDate }] : []}
        />
      ))}
    </List>
  );
}
