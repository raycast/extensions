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
  lastRead?: number;
}

type StoryLastRead = {
  [key: string]: number;
};
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
        props.item.lastRead
          ? { icon: Icon.Eye, tooltip: `Last Read: ${new Date(props.item.lastRead).toDateString()}` }
          : { icon: Icon.EyeDisabled, tooltip: "Last Read: never" },
        {
          text: timeAgo.format(props.item.date) as string,
          icon: props.item.isNew ? { source: Icon.Dot, tintColor: Color.Green } : undefined,
        },
      ]}
    />
  );
}

async function updateLastRead(props: { item: Story }) {
  const lastRead = new Date().valueOf();
  const storyLastViewedString = await LocalStorage.getItem<string>("storyLastRead");
  const storyLastRead: StoryLastRead = await JSON.parse(storyLastViewedString ?? "{}");
  storyLastRead[props.item.guid] = lastRead;
  await LocalStorage.setItem("storyLastRead", JSON.stringify(storyLastRead));
}

function ReadStory(props: { item: Story }) {
  return props.item.content ? (
    <Action.Push
      icon={Icon.Book}
      title="Read Story"
      target={<StoryDetail item={props.item} />}
      onPush={() => updateLastRead(props)}
    />
  ) : null;
}

function OpenStory(props: { item: Story }) {
  return props.item.link ? <Action.OpenInBrowser url={props.item.link} onOpen={() => updateLastRead(props)} /> : null;
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
  const feedLastViewedString = await LocalStorage.getItem<string>("feedLastViewed");
  const feedLastViewed: FeedLastViewed = JSON.parse(feedLastViewedString ?? "{}");

  const storyItems: Story[] = [];
  const storyLastViewedString = await LocalStorage.getItem<string>("storyLastRead");
  const storyLastRead: StoryLastRead = JSON.parse(storyLastViewedString ?? "{}");

  for (const feedItem of feeds) {
    const lastViewed = feedLastViewed[feedItem.url] || 0;
    try {
      const feed = await parser.parseURL(feedItem.url);
      const stories: Story[] = [];
      feed.items.forEach((item) => {
        const story = ItemToStory(item, feedItem, lastViewed);
        const lastRead = storyLastRead[story.guid] || 0;
        stories.push({ ...story, lastRead });
      });
      feedLastViewed[feedItem.url] = stories.at(0)?.date || lastViewed;
      storyItems.push(...stories);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        <List.Dropdown onChange={setFilter} tooltip="Subscription">
          <List.Dropdown.Section>
            <List.Dropdown.Item icon={Icon.Globe} title="All Subscriptions" value="all" />
          </List.Dropdown.Section>
          {data?.feeds && data.feeds.length > 1 && (
            <List.Dropdown.Section>
              {data.feeds.map((feed) => (
                <List.Dropdown.Item key={feed.url} icon={feed.icon} title={feed.title} value={feed.url} />
              ))}
            </List.Dropdown.Section>
          )}
          <List.Dropdown.Section>
            <List.Dropdown.Item icon={Icon.Eye} title="Read" value="read" />
            <List.Dropdown.Item icon={Icon.EyeDisabled} title="Unread" value="unread" />
          </List.Dropdown.Section>
        </List.Dropdown>
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
        .filter((story) => {
          if (filter === "read") return story.lastRead;
          if (filter === "unread") return !story.lastRead;
          return filter === "all" || story.fromFeed === filter;
        })
        .map((story) => <StoryListItem key={story.guid} item={story} refresh={revalidate} />)}
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
