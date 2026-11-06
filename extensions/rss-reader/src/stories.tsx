import {
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Action,
  type Image,
  LocalStorage,
  Toast,
  Detail,
  Cache,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { NodeHtmlMarkdown } from "node-html-markdown";
import React from "react";
import Parser from "rss-parser";
import { type Feed, getFeeds } from "./feeds";
import AddFeedForm from "./subscription-form";
import { getStoryGuid, getStoryLastRead } from "./utils";

const parser = new Parser({});
const preference = getPreferenceValues();
const storiesCache = new Cache({ namespace: "stories" });
const STORIES_FILTER_CACHE_KEY = "selected-filter";
const STORIES_FILTER_TTL_MS = 15 * 60 * 1000;

type CachedFilter = {
  value: string;
  savedAt: number;
};

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

function getCachedFilter() {
  const raw = storiesCache.get(STORIES_FILTER_CACHE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as CachedFilter;
    const isFresh = Date.now() - parsed.savedAt < STORIES_FILTER_TTL_MS;

    if (!isFresh) {
      storiesCache.remove(STORIES_FILTER_CACHE_KEY);
      return undefined;
    }

    return parsed.value;
  } catch {
    storiesCache.remove(STORIES_FILTER_CACHE_KEY);
    return undefined;
  }
}

function setCachedFilter(value: string) {
  storiesCache.set(
    STORIES_FILTER_CACHE_KEY,
    JSON.stringify({
      value,
      savedAt: Date.now(),
    } satisfies CachedFilter),
  );
}

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

function StoryListItem(props: { item: Story; refresh: () => void; onRead: (item: Story) => void }) {
  return (
    <List.Item
      icon={props.item.icon}
      title={props.item.title}
      subtitle={preference.showSubtitle ? props.item.subtitle : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenStory item={props.item} onRead={props.onRead} />
            <ReadStory item={props.item} onRead={props.onRead} />
            <CopyStory item={props.item} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Refresh Stories" icon={Icon.ArrowClockwise} onAction={props.refresh} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        props.item.lastRead
          ? {
              icon: Icon.Eye,
              tooltip: `Last Read: ${new Date(props.item.lastRead).toDateString()}`,
            }
          : { icon: Icon.EyeDisabled, tooltip: "Last Read: never" },
        {
          text: timeAgo.format(props.item.date) as string,
          icon: props.item.isNew ? { source: Icon.Dot, tintColor: Color.Green } : undefined,
        },
      ]}
    />
  );
}

async function updateLastRead(guid: string, lastRead: number) {
  const storyLastViewedString = await LocalStorage.getItem<string>("storyLastRead");
  const storyLastRead: StoryLastRead = await JSON.parse(storyLastViewedString ?? "{}");
  storyLastRead[guid] = lastRead;
  await LocalStorage.setItem("storyLastRead", JSON.stringify(storyLastRead));
}

function ReadStory(props: { item: Story; onRead: (item: Story) => void }) {
  return props.item.content ? (
    <Action.Push
      icon={Icon.Book}
      title="Read Story"
      target={<StoryDetail item={props.item} onRead={props.onRead} />}
      onPush={() => props.onRead(props.item)}
    />
  ) : null;
}

function OpenStory(props: { item: Story; onRead: (item: Story) => void }) {
  return props.item.link ? (
    <Action.OpenInBrowser url={props.item.link} onOpen={() => props.onRead(props.item)} />
  ) : null;
}

function CopyStory(props: { item: Story }) {
  return props.item.link ? (
    <Action.CopyToClipboard content={props.item.link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
  ) : null;
}

function ItemToStory(item: Parser.Item, feed: Feed, lastViewed: number) {
  const date = item.pubDate ? Date.parse(item.pubDate) : 0;
  return {
    guid: getStoryGuid(item, feed.url),
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

  // Read this once the feeds have loaded, so stories marked as read while they were loading keep their mark.
  const storyLastViewedString = await LocalStorage.getItem<string>("storyLastRead");
  const storyLastRead: StoryLastRead = JSON.parse(storyLastViewedString ?? "{}");
  return storyItems.map((story) => ({
    ...story,
    lastRead: getStoryLastRead(storyLastRead, story.guid, story.link),
  }));
}

export function StoriesList(props: { feeds?: Feed[] }) {
  async function fetchStories(feeds?: Feed[]) {
    if (typeof feeds === "undefined") {
      feeds = await getFeeds();
    }

    return { feeds, stories: await getStories(feeds) };
  }
  const { data, isLoading, revalidate, mutate } = useCachedPromise(fetchStories, [props.feeds]);
  const [filter, setFilter] = React.useState(() => getCachedFilter() ?? "all");

  // Update the loaded stories in place: refetching every feed would also clear the "new" dots.
  const markAsRead = React.useCallback(
    (item: Story) => {
      const lastRead = Date.now();
      mutate(updateLastRead(item.guid, lastRead), {
        optimisticUpdate: (data) =>
          data && {
            ...data,
            stories: data.stories.map((story) => (story.guid === item.guid ? { ...story, lastRead } : story)),
          },
        shouldRevalidateAfter: false,
      });
    },
    [mutate],
  );

  React.useEffect(() => {
    if (!data?.feeds) {
      return;
    }

    const validFilters = new Set(["all", "read", "unread", ...data.feeds.map((feed) => feed.url)]);
    if (!validFilters.has(filter)) {
      setFilter("all");
      storiesCache.remove(STORIES_FILTER_CACHE_KEY);
    }
  }, [data?.feeds, filter]);

  const handleFilterChange = React.useCallback((newFilter: string) => {
    setFilter(newFilter);
    setCachedFilter(newFilter);
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown onChange={handleFilterChange} tooltip="Subscription" value={filter}>
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
        .map((story) => (
          <StoryListItem
            key={`${story.fromFeed}:${story.guid}`}
            item={story}
            refresh={revalidate}
            onRead={markAsRead}
          />
        ))}
    </List>
  );
}

function StoryDetail(props: { item: Story; onRead: (item: Story) => void }) {
  return (
    <Detail
      navigationTitle={props.item.title}
      markdown={NodeHtmlMarkdown.translate(props.item.content || "")}
      actions={
        <ActionPanel>
          <OpenStory item={props.item} onRead={props.onRead} />
          <CopyStory item={props.item} />
        </ActionPanel>
      }
    />
  );
}

export default () => {
  return <StoriesList />;
};
