import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle, Icon, Color, getLocalStorageItem, setLocalStorageItem, clearSearchBar, useNavigation, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import FeedsList from "./feeds";
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
  feeds?: string[];
}

export default function Index() {
  const [state, setState] = useState<State>({});
  const [newFeed, setNewFeed] = useState("");
  const [loading, setLoading] = useState(true);
  

  async function fetchStories() {
    try {
      setLoading(true)
      let items : Story[] = []
      const lastViewed = await getLocalStorageItem("lastViewed") as number
      const feedsString = await getLocalStorageItem("feeds") as string
      let feeds : any
      
      if (feedsString === undefined) {
        setLoading(false);
        return;
      }
      feeds = JSON.parse(feedsString)
      if (feeds.urls === undefined || feeds.urls.length == 0) {
        setLoading(false);
        return;
      }

      for (const feedURL of feeds.urls) {
        const feed = await parser.parseURL(feedURL);
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
        feeds: feeds.urls
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

  const addFeed = async () => {
    try {
      if (newFeed.length === 0) {
        await showToast(ToastStyle.Failure, "Empty feed URL", "Feed URL cannot be empty");
        return;
      }

      const feed = await parser.parseURL(newFeed)
      
      let feedsString = await getLocalStorageItem("feeds") as string
      let feeds = {
        urls: [] as string[]
      }
      if (feedsString !== undefined) {
        feeds = JSON.parse(feedsString)
      }
      if (feeds.urls.includes(newFeed)) {
        await showToast(ToastStyle.Failure, "Feed already exists", newFeed);
        return;
      }
      feeds.urls.push(newFeed)
      await setLocalStorageItem("feeds", JSON.stringify(feeds));

      await showToast(ToastStyle.Success, "Subscribed!", newFeed);
      await clearSearchBar();
      
      fetchStories();
  } catch (error) {
    await clearSearchBar();
    showToast(ToastStyle.Failure, "Can't find feed", "No valid feed found on " + newFeed);
  }
  };

  const removeFeeds = async () => {
    let feeds = {
      urls: [] as string[]
    }
    await setLocalStorageItem("feeds", JSON.stringify(feeds));

    await showToast(ToastStyle.Success, "Unsubscribed from all feeds!");
    await clearSearchBar();
    setState({});
  };

  const { push } = useNavigation();

  const fetchAfterFeeds = () => {
    fetchStories();
    setState({});
  }

  return (
    <List
      isLoading={ loading }
      onSearchTextChange={(text: string) => setNewFeed(text.trim())}
      searchBarPlaceholder={"Type feed URL and hit enter to subscribe..."}
      actions={
        <ActionPanel>
          <ActionPanel.Item 
            title="Subscribe to Feed" 
            onAction={() => addFeed()}
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
          />
        </ActionPanel>
      }
    >
      { !loading && state.feeds === undefined && (
        <List.Item 
          key="empty"
          title="No feeds"
          subtitle="Type feed URL in the field above and hit enter"
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
        />
      )}
      { state.feeds !== undefined && state.feeds!.length > 0 && (
        <List.Section title="Feeds">
          <List.Item 
            title="Show All Feeds..."
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  title="Show All Feeds"
                  onAction={() => push(<FeedsList callback={fetchAfterFeeds}/>)}
                  icon={{ source: Icon.List, tintColor: Color.Green }}
                />
                <ActionPanel.Item
                  title="Unsubscribe from All Feeds"
                  onAction={() => removeFeeds()}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                />
              </ActionPanel>
            }
          />
        </List.Section> 
      )}
      { state.feeds !== undefined && state.feeds!.length > 0 && (
        <List.Section title="Stories">
          {state.items?.map((item) => (
            <StoryListItem key={item.guid} item={item} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function StoryListItem(props: { item: Story }) {
  const pubAgo = getTimeAgo(props.item) as string;

  return (
    <List.Item
      title={props.item.title ?? "No title"}
      icon={ props.item.icon || Icon.Text}
      accessoryIcon={props.item.isNew ? { source: Icon.Dot, tintColor: Color.Green } : undefined}
      accessoryTitle={pubAgo}
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

function getTimeAgo(item: Story) {
  return timeAgo.format(Date.parse(item.pubDate!))
}
