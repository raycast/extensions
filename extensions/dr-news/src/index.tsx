import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import Parser from "rss-parser";
import { getIcon } from "./utils";

const parser = new Parser();

interface FeedType {
  name: string;
  url: string;
}

interface FeedDropDownProps {
  feedTypes: FeedType[];
  onFeedChange: (selectedFeedUrl: string) => void;
}

function FeedDropDown({ feedTypes, onFeedChange }: FeedDropDownProps) {
  return (
    <List.Dropdown
      tooltip="Select Feed"
      storeValue={true}
      onChange={(selected) => {
        onFeedChange(selected);
      }}
    >
      <List.Dropdown.Section title="Feeds">
        {feedTypes.map((feedType) => (
          <List.Dropdown.Item key={feedType.url} title={feedType.name} value={feedType.url} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const feedTypes: FeedType[] = [
    { name: "Latest News", url: "https://www.dr.dk/nyheder/service/feeds/senestenyt" },
    { name: "Domestic", url: "https://www.dr.dk/nyheder/service/feeds/indland" },
    { name: "Foreign", url: "https://www.dr.dk/nyheder/service/feeds/udland" },
    { name: "Money", url: "https://www.dr.dk/nyheder/service/feeds/penge" },
    { name: "Politics", url: "https://www.dr.dk/nyheder/service/feeds/politik" },
    { name: "Sports", url: "https://www.dr.dk/nyheder/service/feeds/sporten" },
    { name: "Latest Sports", url: "https://www.dr.dk/nyheder/service/feeds/senestesport" },
    { name: "Knowledge", url: "https://www.dr.dk/nyheder/service/feeds/viden" },
    { name: "Culture", url: "https://www.dr.dk/nyheder/service/feeds/kultur" },
    { name: "Music", url: "https://www.dr.dk/nyheder/service/feeds/musik" },
    { name: "My Life", url: "https://www.dr.dk/nyheder/service/feeds/mitliv" },
    { name: "Food", url: "https://www.dr.dk/nyheder/service/feeds/mad" },
    { name: "Weather", url: "https://www.dr.dk/nyheder/service/feeds/vejret" },
    { name: "Regional", url: "https://www.dr.dk/nyheder/service/feeds/regionale" },
    { name: "DR Capital Region", url: "https://www.dr.dk/nyheder/service/feeds/regionale/kbh" },
    { name: "DR Bornholm Island", url: "https://www.dr.dk/nyheder/service/feeds/regionale/bornholm" },
    {
      name: "DR South & South Jutland",
      url: "https://www.dr.dk/nyheder/service/feeds/regionale/syd",
    },
    { name: "DR Funen", url: "https://www.dr.dk/nyheder/service/feeds/regionale/fyn" },
    {
      name: "DR Central & West Jutland",
      url: "https://www.dr.dk/nyheder/service/feeds/regionale/vest",
    },
    { name: "DR North Jutland", url: "https://www.dr.dk/nyheder/service/feeds/regionale/nord" },
    {
      name: "DR Triangle Area",
      url: "https://www.dr.dk/nyheder/service/feeds/regionale/trekanten",
    },
    { name: "DR Zealand", url: "https://www.dr.dk/nyheder/service/feeds/regionale/sjaelland" },
    { name: "DR East Jutland", url: "https://www.dr.dk/nyheder/service/feeds/regionale/oestjylland" },
  ];

  const [feed, setFeed] = useState("https://www.dr.dk/nyheder/service/feeds/senestenyt");
  const { data, isLoading } = useFetch(feed, {
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`);
      }

      const textData = await response.text();
      const feedData = await parser.parseString(textData);
      return feedData.items;
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by title..."
      searchBarAccessory={<FeedDropDown feedTypes={feedTypes} onFeedChange={setFeed} />}
    >
      {data &&
        data.map((item, index) => {
          const pubDate = new Date(item.pubDate as string);
          return (
            <List.Item
              icon={getIcon(index + 1)}
              title={item.title ?? "No Title"}
              accessories={[{ date: pubDate, tooltip: pubDate.toLocaleString() }]}
              key={item.link}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.link ?? "https://dr.dk/"} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
