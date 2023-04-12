import { ActionPanel, Color, Icon, List, showToast, Action, Image, LocalStorage, Toast, Detail } from "@raycast/api";
import { Feed, getFeeds } from "./feeds";
import AddFeedForm from "./subscription-form";
import Parser from "rss-parser";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { nanoid } from "nanoid";
import { useCachedPromise } from "@raycast/utils";
import React from "react";

const parser = new Parser({});

interface Story {
  guid: string;
  title: string;
  subtitle: string;
  link?: string;
  content?: string;
  icon: Image.ImageLike;
  isNew: boolean;
  date: number;
  fromFeed: string;
}

type FeedLastViewed = {
  [key: string]: number;
};

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

function StoryListItem(props: { item: Story; refresh: () => void }) {
  return (
    <List.Item
      icon={props.item.icon}
      title={props.item.title}
      subtitle={props.item.subtitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenStory item={props.item} />
            <ReadStory item={props.item} />
            <CopyStory item={props.item} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Refresh Stories" icon={Icon.ArrowClockwise} onAction={props.refresh} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: timeAgo.format(props.item.date) as string,
          icon: props.item.isNew ? { source: Icon.Dot, tintColor: Color.Green } : undefined,
        },
      ]}
    />
  );
}

function ReadStory(props: { item: Story }) {
  return props.item.content ? (
    <Action.Push icon={Icon.Book} title="Read Story" target={<StoryDetail item={props.item} />} />
  ) : null;
}

function OpenStory(props: { item: Story }) {
  return props.item.link ? <Action.OpenInBrowser url={props.item.link} /> : null;
}

function CopyStory(props: { item: Story }) {
  return props.item.link ? (
    <Action.CopyToClipboard content={props.item.link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
  ) : null;
}

function ItemToStory(item: Parser.Item, feed: Feed, lastViewed: number) {
  const date = item.pubDate ? Date.parse(item.pubDate) : 0;
  return {
    guid: item.guid || nanoid(),
    title: item.title || "No title",
    subtitle: feed.title,
    link: item.link,
    content: item.content,
    isNew: date > lastViewed,
    date,
    icon: feed.icon,
    fromFeed: feed.url,
  } as Story;
}

async function getStories(feeds: Feed[]) {
  const feedLastViewedString = (await LocalStorage.getItem("feedLastViewed")) as string;
  const feedLastViewed = feedLastViewedString
    ? (JSON.parse(feedLastViewedString) as FeedLastViewed)
    : ({} as FeedLastViewed);

  const storyItems: Story[] = [];

  for (const feedItem of feeds) {
    const lastViewed = feedLastViewed[feedItem.url] || 0;
    try {
      const feed = await parser.parseURL(feedItem.url);
      const stories: Story[] = [];
      feed.items.forEach((item) => {
        stories.push(ItemToStory(item, feedItem, lastViewed));
      });
      feedLastViewed[feedItem.url] = stories.at(0)?.date || lastViewed;
      storyItems.push(...stories);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Can't get stories",
        message: "Error occured when fetching " + feedItem.title,
      });
    }
  }
  storyItems.sort((a, b) => b.date - a.date);
  await LocalStorage.setItem("feedLastViewed", JSON.stringify(feedLastViewed));
  return storyItems;
}

export function StoriesList(props: { feeds?: Feed[] }) {
  async function fetchStories(feeds?: Feed[]) {
    if (typeof feeds == "undefined") {
      feeds = await getFeeds();
    }

    return { feeds, stories: await getStories(feeds) };
  }
  const { data, isLoading, revalidate } = useCachedPromise(fetchStories, [props.feeds]);
  const [filter, setFilter] = React.useState("all");

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        data?.feeds.length && data.feeds.length > 1 ? (
          <List.Dropdown onChange={setFilter} tooltip="Subscription">
            <List.Dropdown.Section>
              <List.Dropdown.Item icon={Icon.Globe} title="All Subscriptions" value="all" />
            </List.Dropdown.Section>
            <List.Dropdown.Section>
              {data?.feeds.map((feed) => (
                <List.Dropdown.Item key={feed.url} icon={feed.icon} title={feed.title} value={feed.url} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : null
      }
      actions={
        !props?.feeds && (
          <ActionPanel>
            <Action.Push
              title="Add Feed"
              target={<AddFeedForm />}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        )
      }
    >
      {data?.stories
        .filter((story) => filter === "all" || story.fromFeed === filter)
        .map((story) => (
          <StoryListItem key={story.guid} item={story} refresh={revalidate} />
        ))}
    </List>
  );
}

function StoryDetail(props: { item: Story }) {
  return (
    <Detail
      navigationTitle={props.item.title}
      markdown={NodeHtmlMarkdown.translate(props.item.content || "")}
      actions={
        <ActionPanel>
          <OpenStory item={props.item} />
          <CopyStory item={props.item} />
        </ActionPanel>
      }
    />
  );
}

export default () => {
  return <StoriesList />;
};
