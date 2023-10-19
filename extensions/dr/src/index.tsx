import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import Parser from "rss-parser";

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
      tooltip="Select feed"
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
    { name: "Seneste nyt (Latest News)", url: "https://www.dr.dk/nyheder/service/feeds/senestenyt" },
    { name: "Indland (Domestic)", url: "https://www.dr.dk/nyheder/service/feeds/indland" },
    { name: "Udland (Foreign)", url: "https://www.dr.dk/nyheder/service/feeds/udland" },
    { name: "Penge (Money)", url: "https://www.dr.dk/nyheder/service/feeds/penge" },
    { name: "Politik (Politics)", url: "https://www.dr.dk/nyheder/service/feeds/politik" },
    { name: "Sporten (Sports)", url: "https://www.dr.dk/nyheder/service/feeds/sporten" },
    { name: "Seneste sport (Latest Sports)", url: "https://www.dr.dk/nyheder/service/feeds/senestesport" },
    { name: "Viden (Knowledge)", url: "https://www.dr.dk/nyheder/service/feeds/viden" },
    { name: "Kultur (Culture)", url: "https://www.dr.dk/nyheder/service/feeds/kultur" },
    { name: "Musik (Music)", url: "https://www.dr.dk/nyheder/service/feeds/musik" },
    { name: "Mit Liv (My Life)", url: "https://www.dr.dk/nyheder/service/feeds/mitliv" },
    { name: "Mad (Food)", url: "https://www.dr.dk/nyheder/service/feeds/mad" },
    { name: "Vejret (Weather)", url: "https://www.dr.dk/nyheder/service/feeds/vejret" },
    { name: "Regionale (Regional)", url: "https://www.dr.dk/nyheder/service/feeds/regionale" },
    { name: "DR Hovedstadsområdet (DR Capital Region)", url: "https://www.dr.dk/nyheder/service/feeds/regionale/kbh" },
    { name: "DR Bornholm (DR Bornholm Island)", url: "https://www.dr.dk/nyheder/service/feeds/regionale/bornholm" },
    {
      name: "DR Syd og Sønderjylland (DR South & South Jutland)",
      url: "https://www.dr.dk/nyheder/service/feeds/regionale/syd",
    },
    { name: "DR Fyn (DR Funen)", url: "https://www.dr.dk/nyheder/service/feeds/regionale/fyn" },
    {
      name: "DR Midt- og Vestjylland (DR Central & West Jutland)",
      url: "https://www.dr.dk/nyheder/service/feeds/regionale/vest",
    },
    { name: "DR Nordjylland (DR North Jutland)", url: "https://www.dr.dk/nyheder/service/feeds/regionale/nord" },
    {
      name: "DR Trekantområdet (DR Triangle Area)",
      url: "https://www.dr.dk/nyheder/service/feeds/regionale/trekanten",
    },
    { name: "DR Sjælland (DR Zealand)", url: "https://www.dr.dk/nyheder/service/feeds/regionale/sjaelland" },
    { name: "DR Østjylland (DR East Jutland)", url: "https://www.dr.dk/nyheder/service/feeds/regionale/oestjylland" },
  ];

  const [feed, setFeed] = useState("https://www.dr.dk/nyheder/service/feeds/senestenyt");
  const { data, isLoading, error } = useFetch(feed, {
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`);
      }

      const textData = await response.text();
      const feedData = await parser.parseString(textData);
      return feedData.items;
    },
  });

  useEffect(() => {
    if (isLoading) {
      showToast({ title: "Loading", message: "Fetching the feed..." });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to fetch feed: ${error.message}`,
      });
    } else {
      showToast({ title: "Success", message: "Feed fetched successfully!" });
    }
  }, [isLoading, error]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by title..."
      searchBarAccessory={<FeedDropDown feedTypes={feedTypes} onFeedChange={setFeed} />}
    >
      {data &&
        data.map((item) => (
          <List.Item
            icon="list-icon.png"
            title={item.title ?? "No Title"}
            accessoryTitle={item.pubDate}
            key={item.link}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.link ?? "https://dr.dk/"} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
