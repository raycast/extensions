import { ActionPanel, List, showToast, ToastStyle, Icon, Color, getLocalStorageItem, setLocalStorageItem, PushAction } from "@raycast/api";
import { useEffect, useState } from "react";
import { AddFeedForm } from "./add-feed"

export interface Feed {
  url: string;
  title?: string;
  icon?: string
}
  
interface State {
  items?: Feed[];
  error?: Error;
}

export default function FeedsList() {
  const [state, setState] = useState<State>({});
  const [loading, setLoading] = useState(true);

  async function getFeeds() {
    try {
      setLoading(true)
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

      setState({ 
        items: feeds,
      });
      setLoading(false)
    } catch (error) {
      setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
    }
  }

  useEffect(() => {
    getFeeds();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading feeds", state.error.message);
  }

  const removeFeed = async (index: number) => {
    const removedFeed = state.items?.at(index)?.title
    let feedItems = state.items
    feedItems?.splice(index, 1)
    await setLocalStorageItem("feeds", JSON.stringify(feedItems));

    await showToast(ToastStyle.Success, "Unsubscribed from the feed!", removedFeed);

    setState({
      items: feedItems
    })
  };

  return (
    <List
      isLoading={ loading }
    >
      { !loading && ( state.items === undefined || state.items.length === 0 ) && (
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
      {state.items?.map((item, index) => (
        <List.Item
          key={item.url}
          title={item.title ?? "No title"}
          icon = { item.icon || Icon.TextDocument }
          actions={
            <ActionPanel>
              <ActionPanel.Item 
                title="Unsubscribe from Feed"
                onAction={() => removeFeed(index)}
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}