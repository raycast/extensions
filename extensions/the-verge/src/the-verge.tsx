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
  const [rssLink, setRssLink] = useState("https://www.theverge.com/rss/index.xml");
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
          tooltip="Select Category"
          defaultValue={"Top"}
          storeValue
          onChange={(newValue) => setRssLink(newValue as string)}
        >
          <List.Dropdown.Item title={"Top"} value={"https://www.theverge.com/rss/full.xml"} />
          <List.Dropdown.Item title={"Tech"} value={"https://www.theverge.com/tech/rss/index.xml"} />
          <List.Dropdown.Item title={"Science"} value={"https://www.theverge.com/science/rss/index.xml"} />
          <List.Dropdown.Item title={"Health"} value={"https://www.theverge.com/rss/health/index.xml"} />
          <List.Dropdown.Item title={"Environment"} value={"https://www.theverge.com/rss/environment/index.xml"} />
          <List.Dropdown.Item title={"Creators"} value={"https://www.theverge.com/rss/creators/index.xml"} />
          <List.Dropdown.Item title={"Entertainment"} value={"https://www.theverge.com/rss/entertainment/index.xml"} />
          <List.Dropdown.Item title={"Culture"} value={"https://www.theverge.com/culture/rss/index.xml"} />
          <List.Dropdown.Item
            title={"Transportation"}
            value={"https://www.theverge.com/transportation/rss/index.xml"}
          />
          <List.Dropdown.Item title={"Reviews"} value={"https://www.theverge.com/reviews/rss/index.xml"} />
          <List.Dropdown.Item title={"Features"} value={"https://www.theverge.com/rss/features/index.xml"} />
          <List.Dropdown.Item title={"Exclusive"} value={"https://www.theverge.com/rss/exclusive/index.xml"} />
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
      <rect x="0" y="0" width="40" height="40" fill="#450ADF" rx="10"></rect>
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
