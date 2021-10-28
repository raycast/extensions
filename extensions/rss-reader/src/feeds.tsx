import { ActionPanel, List, showToast, ToastStyle, Icon, Color, setLocalStorageItem } from "@raycast/api";
import { useState } from "react";
import { State as IndexState } from "./index";

export interface Feed {
  url: string;
  title?: string;
  icon?: string
}

export function FeedsList(props: { indexState: IndexState, callback: (indexState: IndexState) => any }) {
  const [feeds, setFeeds] = useState<Feed[]>(props.indexState.feeds)

  const removeFeed = async (index: number) => {
    const removedFeed = feeds.at(index) as Feed
    let feedItems = [...feeds]
    feedItems.splice(index, 1)

    await setLocalStorageItem("feeds", JSON.stringify(feedItems));
    setFeeds(feedItems)
    await showToast(ToastStyle.Success, "Unsubscribed from the feed!", removedFeed.title);

    const stories = props.indexState.stories.filter(story => story.fromFeed != removedFeed.url)
    props.callback({
      feeds: feedItems,
      stories: stories
    })
  };

  return (
    <List>
      { feeds.length === 0 && (
        <List.Item 
          key="empty"
          title="No feeds"
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
        />
      )}
      {feeds.map((item, index) => (
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