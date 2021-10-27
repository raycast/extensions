import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle, Icon, Color, getLocalStorageItem, setLocalStorageItem, PushAction } from "@raycast/api";
import { useEffect, useState } from "react";
import { Feed } from "./feeds";
import { AddFeedForm } from "./add-feed"
import Parser from "rss-parser";
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en.json'

const parser = new Parser({});

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

interface Story extends Parser.Item {
  icon?: string;
  isNew?: boolean;
  date?: number;
}

interface State {
  items?: Story[];
  lastViewed?: number;
  error?: Error;
  feeds?: Feed[];
}

export default function Index() {
  const [state, setState] = useState<State>({});
  const [loading, setLoading] = useState(true);
  

  async function fetchStories() {
    try {
      setLoading(true)
      let items : Story[] = []
      const lastViewed = await getLocalStorageItem("lastViewed") as number
      const feedsString = await getLocalStorageItem("feeds") as string
      let feeds : Feed[]
      
      if (feedsString === undefined) {
        setLoading(false);
        return;
      }
      feeds = JSON.parse(feedsString)
      if (feeds.length == 0) {
        setLoading(false);
        return;
      }

      for (const feedItem of feeds) {
        const feed = await parser.parseURL(feedItem.url);
        feed.items.map((item) => {
          let story : Story
          story = item
          story.icon = feed.image?.url
          story.date = Date.parse(story.pubDate!)
          story.isNew = ( story.date > lastViewed )
          items!.push(story)
        })
      }
      
      items.sort((a, b) => b.date! - a.date!)
      setState({ 
        items: items,
        lastViewed: lastViewed,
        feeds: feeds
      });
      setLoading(false)
      await setLocalStorageItem("lastViewed", items.at(0)?.date!);
    } catch (error) {
      setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
    }
  }

  useEffect(() => {
    fetchStories();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading stories", state.error.message);
  }

  return (
    <List isLoading={ loading } >
      { !loading && ( state.feeds === undefined || state.feeds.length === 0 ) && (
        <List.Item 
          key="empty"
          title="No feeds"
          subtitle="Press enter to add subscription"
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <PushAction title="Add Subscription" target={<AddFeedForm />} />
            </ActionPanel>
          }
        />
      )}
      { state.feeds !== undefined && state.feeds!.length > 0 && state.items?.map((item) => (
        <StoryListItem key={item.guid} item={item} />
      ))}
    </List>
  );
}

function StoryListItem(props: { item: Story }) {
  return (
    <List.Item
      title={props.item.title ?? "No title"}
      icon={ props.item.icon || Icon.Text}
      accessoryIcon={props.item.isNew ? { source: Icon.Dot, tintColor: Color.Green } : undefined}
      accessoryTitle={timeAgo.format(props.item.date!) as string}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Story }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.link && <OpenInBrowserAction url={props.item.link} />}
      </ActionPanel.Section>
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