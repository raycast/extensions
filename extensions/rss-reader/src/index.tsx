import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle, Icon, Color, getLocalStorageItem, setLocalStorageItem, PushAction, clearSearchBar } from "@raycast/api";
import { useEffect, useState } from "react";
import { Feed, FeedsList } from "./feeds";
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
  fromFeed?: string;
}

export interface State {
  stories?: Story[];
  lastViewed?: number;
  error?: Error;
  feeds?: Feed[];
}

export default function Index() {
  const [state, setState] = useState<State>({});
  const [newFeed, setNewFeed] = useState("");
  const [loading, setLoading] = useState(true);
  

  async function fetchStories() {
    try {
      setLoading(true)
      let stories : Story[] = []
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
          story.fromFeed = feedItem.url
          stories!.push(story)
        })
      }
      
      stories.sort((a, b) => b.date! - a.date!)
      setState({ 
        stories: stories,
        lastViewed: lastViewed,
        feeds: feeds
      });
      setLoading(false)
      await setLocalStorageItem("lastViewed", stories.at(0)?.date!);
    } catch (error) {
      setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
    }
  }

  useEffect(() => {
    fetchStories();
  }, []);

  const addFeed = async () => {
    try {
      showToast(ToastStyle.Animated, "Subscribing...")
      await clearSearchBar();
      if (newFeed.length === 0) {
        await showToast(ToastStyle.Failure, "Empty feed URL", "Feed URL cannot be empty");
        return;
      }
      
      const feed = await parser.parseURL(newFeed)
      let feedItem = ({
        url: newFeed,
        title: feed.title!,
        icon: feed.image?.url
      })      

      let feedItems = state.feeds || []
      
      if (feedItems?.some(item => item.url === feedItem.url)) {
        await showToast(ToastStyle.Failure, "Feed already exists", feedItem.title);
        return;
      }
      feedItems?.push(feedItem)
      await setLocalStorageItem("feeds", JSON.stringify(feedItems));


      let stories = state.stories || []
      feed.items.map((item) => {
        let story : Story
        story = item
        story.icon = feed.image?.url
        story.date = Date.parse(story.pubDate!)
        story.isNew = ( story.date > (state.lastViewed || 0) )
        story.fromFeed = feedItem.url
        stories!.push(story)
      })
      stories.sort((a, b) => b.date! - a.date!)

      await showToast(ToastStyle.Success, "Subscribed!", feedItem.title);

      setState({
        stories: stories,
        feeds: feedItems
      })
    } catch (error) {
      showToast(ToastStyle.Failure, "Can't find feed", "No valid feed found on " + newFeed);
    }
  };

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading stories", state.error.message);
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
             onAction={addFeed}
             icon={{ source: Icon.Plus, tintColor: Color.Green }}
           />
         </ActionPanel>
       }
     >
      { !loading && ( state.feeds === undefined || state.feeds.length === 0 ) && (
        <List.Item 
          key="empty"
          title="No feeds"
          subtitle="Type feed URL in the field above and press enter to subscribe"
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
        />
      )}
      { state.feeds !== undefined && state.feeds!.length > 0 && (
         <List.Section title="Feeds">
           <List.Item 
             title="Show All Feeds..."
             actions={
               <ActionPanel>
                 <PushAction
                   title="Show All Feeds"
                   target={<FeedsList indexState={state} callback={setState}/>}
                   icon={{ source: Icon.List, tintColor: Color.Green }}
                 />
               </ActionPanel>
             }
           />
         </List.Section> 
       )}
      { state.feeds !== undefined && state.feeds!.length > 0 && (
        <List.Section title="Stories">
          {state.stories?.map((story) => (
            <StoryListItem key={story.guid} item={story} />
          ))}
        </List.Section>
      )}
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