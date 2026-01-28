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
  const [rssLink, setRssLink] = useState("https://rb.ru/feeds/all/");
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
          defaultValue={"VK"}
          storeValue
          onChange={(newValue) => setRssLink(newValue as string)}
        >
          <List.Dropdown.Item title={"VK"} value={"https://rb.ru/feeds/tag/vk/"} />
          <List.Dropdown.Item title={"RVK"} value={"https://rb.ru/feeds/tag/rvc"} />
          <List.Dropdown.Item title={"Skolkovo Foundation"} value={"https://rb.ru/feeds/tag/skolkovo/"} />
          <List.Dropdown.Item title={"Yandex"} value={"https://rb.ru/feeds/tag/yandex/"} />
          <List.Dropdown.Item title={"Airbnb"} value={"https://rb.ru/feeds/tag/airbnb/"} />
          <List.Dropdown.Item title={"Apple"} value={"https://rb.ru/feeds/tag/apple/"} />
          <List.Dropdown.Item title={"Facebook"} value={"https://rb.ru/feeds/tag/facebook/"} />
          <List.Dropdown.Item title={"Google (Alphabet)"} value={"https://rb.ru/feeds/tag/google/"} />
          <List.Dropdown.Item title={"Mail.ru Group"} value={"https://rb.ru/feeds/tag/mailru/"} />
          <List.Dropdown.Item title={"Microsoft"} value={"https://rb.ru/feeds/tag/microsoft/"} />
          <List.Dropdown.Item title={"Tesla"} value={" https://rb.ru/feeds/tag/tesla/"} />
          <List.Dropdown.Item title={"Twitter"} value={"https://rb.ru/feeds/tag/twitter/"} />
          <List.Dropdown.Item title={"Uber"} value={"https://rb.ru/feeds/tag/uber/"} />
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
      <rect x="0" y="0" width="40" height="40" fill="#A14D5D" rx="10"></rect>
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
