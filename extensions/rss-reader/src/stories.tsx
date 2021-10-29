import { ActionPanel, Color, CopyToClipboardAction, getLocalStorageItem, Icon, ImageLike, List, OpenInBrowserAction, randomId, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api"
import { Feed } from "./feeds"
import Parser from "rss-parser"
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en.json'

const parser = new Parser({});

export interface Story {
  guid: string,
  title: string,
  link?: string,
  icon: ImageLike;
  isNew: boolean;
  date: number;
  fromFeed: string;
}

type FeedLastViewed = {
  [key: string]: number
}

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

export function StoryListItem(props: { item: Story }) {
  return (
    <List.Item
      title={ props.item.title }
      icon={ props.item.icon }
      accessoryTitle={ timeAgo.format(props.item.date) as string }
      accessoryIcon={ props.item.isNew ? { source: Icon.Dot, tintColor: Color.Green } : undefined }
      actions={ <Actions item={ props.item } /> }
    />
  );
}

function Actions(props: { item: Story }) {
  return (
    <ActionPanel title={ props.item.title }>
      <ActionPanel.Section>
        { props.item.link && <OpenInBrowserAction url={ props.item.link } /> }
      </ActionPanel.Section>
      <ActionPanel.Section>
        { props.item.link && (
          <CopyToClipboardAction
            content={ props.item.link }
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function ItemToStory(item: Parser.Item, feed: Feed, lastViewed: number) {
  return {
    guid: item.guid || randomId(),
    title: item.title || "No title",
    link: item.link,
    isNew: ( Date.parse(item.pubDate!) > lastViewed ),
    date: Date.parse(item.pubDate!),
    icon: feed.icon,
    fromFeed: feed.url,
  } as Story
}

export async function getStories(feeds: Feed[]) {
  const feedLastViewedString = await getLocalStorageItem("feedLastViewed") as string
  const feedLastViewed = feedLastViewedString ? JSON.parse(feedLastViewedString) as FeedLastViewed : {} as FeedLastViewed

  let storyItems : Story[] = []

  for (const feedItem of feeds) {
    const lastViewed = feedLastViewed[feedItem.url] || 0
    try {
      const feed = await parser.parseURL(feedItem.url);
      let stories : Story[] = []
      feed.items.forEach((item) => {
        stories.push(ItemToStory(item, feedItem, lastViewed))
      })
      feedLastViewed[feedItem.url] = stories.at(0)?.date || lastViewed
      storyItems.push(...stories)
    } catch(error) {
      await showToast(ToastStyle.Failure, "Can't get stories", "Error occured when fetching " + feedItem.title);
    }
  }
  storyItems.sort((a, b) => b.date - a.date)
  await setLocalStorageItem("feedLastViewed", JSON.stringify(feedLastViewed))
  return storyItems
}