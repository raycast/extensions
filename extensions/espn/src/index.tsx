import { Action, ActionPanel, List, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import Parser from "rss-parser";

const parser = new Parser();

interface Article {
  title: string;
  link: string;
  pubDate: string;
  author: string;
  content: string;
  id: string;
}

export default function Command() {
  const [rssLink, setRssLink] = useState("https://www.espn.com/espn/rss/news");
  const { isLoading, data } = useFetch(rssLink, {
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = await response.text();
      if (data !== undefined) {
        const feed = await parser.parseString(data as string);

        return { items: feed.items as Article[] };
      }
      return { items: [] };
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select a category"
          defaultValue={"Top Headlines"}
          storeValue
          onChange={(newValue) => setRssLink(newValue as string)}
        >
          <List.Dropdown.Item title={"Top Headlines"} value={"https://www.espn.com/espn/rss/news"} />
          <List.Dropdown.Item title={"NFL Headlines"} value={"https://www.espn.com/espn/rss/nfl/news"} />
          <List.Dropdown.Item title={"NBA Headlines"} value={"https://www.espn.com/espn/rss/nba/news"} />
          <List.Dropdown.Item title={"MLB Headlines"} value={"https://www.espn.com/espn/rss/mlb/news"} />
          <List.Dropdown.Item title={"NHL Headlines"} value={"https://www.espn.com/espn/rss/nhl/news"} />
          <List.Dropdown.Item title={"Motorsports Headlines"} value={"https://www.espn.com/espn/rss/rpm/news"} />
          <List.Dropdown.Item title={"Boxing"} value={"https://www.espn.com/espn/rss/boxing/news"} />
          <List.Dropdown.Item title={"MMA"} value={"https://www.espn.com/espn/rss/mma/news"} />
          <List.Dropdown.Item title={"Golf"} value={"https://www.espn.com/espn/rss/golf/news"} />
          <List.Dropdown.Item title={"Soccer"} value={"https://www.espn.com/espn/rss/soccer/news"} />
          <List.Dropdown.Item title={"F1"} value={"https://www.espn.com/espn/rss/f1/news"} />
          <List.Dropdown.Item title={"Tennis"} value={"https://www.espn.com/espn/rss/tennis/news"} />
          <List.Dropdown.Item title={"WWE"} value={"https://www.espn.com/espn/rss/wwe/news"} />
          <List.Dropdown.Item title={"ESPNU"} value={"https://www.espn.com/espn/rss/espnu/news"} />
          <List.Dropdown.Item title={"College Basketball Headlines"} value={"https://www.espn.com/espn/rss/ncb/news"} />
          <List.Dropdown.Item title={"College Football Headlines"} value={"https://www.espn.com/espn/rss/ncf/news"} />
          <List.Dropdown.Item title={"Poker News"} value={"https://www.espn.com/espn/rss/poker/master"} />
        </List.Dropdown>
      }
    >
      {data && data.items?.map((item, index) => <StoryListItem key={item.id} item={item} index={index} />)}
    </List>
  );
}

function StoryListItem(props: { item: Article; index: number }) {
  const icon = getIcon(props.index + 1);
  const date = new Date(props.item.pubDate);

  return (
    <List.Item
      icon={icon}
      title={
        `${props.item.title?.slice(0, 70)}${props.item.title && props.item.title.length > 70 ? "..." : ""}` ??
        "No title"
      }
      subtitle={props.item.author}
      accessories={[{ date: date, tooltip: date.toLocaleString() }]}
      actions={<Actions item={props.item} />}
    />
  );
}

function getIcon(index: number): Image.ImageLike {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <rect x="0" y="0" width="40" height="40" fill="#D93831" rx="10"></rect>
      <text
      font-size="22"
      fill="white"
      font-family="Verdana"
      text-anchor="middle"
      alignment-baseline="baseline"
      x="20.5"
      y="32.5">${index}</text>
    </svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel>
      {props.item.link && <Action.OpenInBrowser url={props.item.link} />}
      {props.item.link && <Action.CopyToClipboard content={props.item.link} title="Copy Link" />}
    </ActionPanel>
  );
}
