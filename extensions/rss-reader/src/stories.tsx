import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  getLocalStorageItem,
  Icon,
  ImageLike,
  List,
  OpenInBrowserAction,
  PushAction,
  randomId,
  setLocalStorageItem,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { Feed, getFeeds } from "./feeds";
import AddFeedForm from "./subscription-form";
import Parser from "rss-parser";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { useEffect, useState } from "react";

const parser = new Parser({});

interface Story {
  guid: string;
  title: string;
  link?: string;
  icon: ImageLike;
  isNew: boolean;
  date: number;
  fromFeed: string;
}

type FeedLastViewed = {
  [key: string]: number;
};

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

function StoryListItem(props: { item: Story }) {
  return (
    <List.Item
      title={props.item.title}
      icon={props.item.icon}
      accessoryTitle={timeAgo.format(props.item.date) as string}
      accessoryIcon={props.item.isNew ? { source: Icon.Dot, tintColor: Color.Green } : undefined}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Story }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>{props.item.link && <OpenInBrowserAction url={props.item.link} />}</ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && (
          <CopyToClipboardAction
            content={props.item.link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ItemToStory(item: Parser.Item, feed: Feed, lastViewed: number) {
  const date = item.pubDate ? Date.parse(item.pubDate) : 0;
  return {
    guid: item.guid || randomId(),
    title: item.title || "No title",
    link: item.link,
    isNew: date > lastViewed,
    date,
    icon: feed.icon,
    fromFeed: feed.url,
  } as Story;
}

async function getStories(feeds: Feed[]) {
  const feedLastViewedString = (await getLocalStorageItem("feedLastViewed")) as string;
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
      await showToast(ToastStyle.Failure, "Can't get stories", "Error occured when fetching " + feedItem.title);
    }
  }
  storyItems.sort((a, b) => b.date - a.date);
  await setLocalStorageItem("feedLastViewed", JSON.stringify(feedLastViewed));
  return storyItems;
}

export function StoriesList(props: { feeds?: Feed[] }) {
  const [feeds, setFeeds] = useState<Feed[]>([] as Feed[]);
  const [stories, setStories] = useState<Story[]>([] as Story[]);
  const [loading, setLoading] = useState(false);

  async function fetchFeeds() {
    if (props?.feeds) {
      setFeeds(props.feeds);
    } else {
      setFeeds(await getFeeds());
    }
  }

  async function fetchStories() {
    if (feeds.length === 0) {
      return;
    }
    setLoading(true);
    setStories(await getStories(feeds));
    setLoading(false);
  }

  useEffect(() => {
    fetchFeeds();
  }, []);

  useEffect(() => {
    fetchStories();
  }, [feeds]);

  return (
    <List
      isLoading={loading}
      actions={
        !props?.feeds && (
          <ActionPanel>
            <PushAction
              title="Add Feed"
              target={<AddFeedForm callback={setFeeds} />}
              icon={{ source: Icon.Plus, tintColor: Color.Green }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        )
      }
    >
      {stories.map((story) => (
        <StoryListItem key={story.guid} item={story} />
      ))}
    </List>
  );
}

export default () => {
  return <StoriesList />;
};
