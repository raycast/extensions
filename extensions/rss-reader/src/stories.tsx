import { ActionPanel, Color, Icon, List, randomId, showToast, Action, Image, LocalStorage, Toast } from "@raycast/api";
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

function StoryListItem(props: { item: Story }) {
  return (
    <List.Item
      title={props.item.title}
      icon={props.item.icon}
      actions={<Actions item={props.item} />}
      accessories={[
        {
          text: timeAgo.format(props.item.date) as string,
          icon: props.item.isNew ? { source: Icon.Dot, tintColor: Color.Green } : undefined,
        },
      ]}
    />
  );
}

function Actions(props: { item: Story }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>{props.item.link && <Action.OpenInBrowser url={props.item.link} />}</ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && (
          <Action.CopyToClipboard
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
  const [feeds, setFeeds] = useState<Feed[]>([] as Feed[]);
  const [stories, setStories] = useState<Story[]>([] as Story[]);
  const [loading, setLoading] = useState(true);

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
            <Action.Push
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
