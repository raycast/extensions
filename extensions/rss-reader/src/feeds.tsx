import { ActionPanel, List, showToast, ToastStyle, Icon, Color, setLocalStorageItem, getLocalStorageItem, PushAction } from "@raycast/api";
import { useEffect, useState } from "react";
import AddFeedForm from "./subscription-form";
import { getStories, Story, StoryListItem } from "./stories"

export interface Feed {
  url: string;
  title: string;
  icon: string;
}

export function FeedsList() {
  const [feeds, setFeeds] = useState<Feed[]>([])

  async function fetchFeeds() {
    setFeeds(await getFeeds())
  }

  useEffect(() => {
    fetchFeeds();
  }, [])

  const removeFeed = async (index: number) => {
    const removedFeed = feeds.at(index) as Feed
    let feedItems = [...feeds]
    feedItems.splice(index, 1)

    await setLocalStorageItem("feeds", JSON.stringify(feedItems));
    setFeeds(feedItems)
    await showToast(ToastStyle.Success, "Unsubscribed from the feed!", removedFeed.title);
  };

  const moveFeed = (index: number, change: number) => {
    if ( index + change < 0 || index + change > feeds.length - 1 ) {
      return
    }
    let feedItems = [...feeds] as Feed[]
    [ feedItems[index], feedItems[index+change] ] = [ feedItems[index+change], feedItems[index] ]
    setFeeds(feedItems)
  }

  return (
    <List
      actions={
        <ActionPanel>
          <PushAction
            title="Add Feed"
            target={ <AddFeedForm callback={ setFeeds } /> }
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {feeds.map((item, index) => (
        <List.Item
          key={ item.url }
          title={ item.title }
          icon = { item.icon }
          actions={
            <ActionPanel>
              <ActionPanel.Section title={ item.title }>
                <PushAction
                  title="Oped Feed"
                  target={ <FeedStoriesList feedItem={ item } /> }
                  icon={{ source: Icon.TextDocument, tintColor: Color.Green }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <PushAction
                  title="Add Feed"
                  target={ <AddFeedForm callback={ setFeeds } /> }
                  icon={{ source: Icon.Plus, tintColor: Color.Green }}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <ActionPanel.Item 
                  title="Remove Feed"
                  onAction={() => removeFeed(index)}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                />
              </ActionPanel.Section>
              { feeds.length > 1 &&
                <ActionPanel.Section>
                  { index != 0 &&
                    <ActionPanel.Item
                      title="Move Up in List"
                      onAction={ () => moveFeed(index, -1) }
                      icon={{ source: Icon.ChevronUp }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    />
                  }
                  { index != feeds.length - 1 &&
                    <ActionPanel.Item
                      title="Move Down in List"
                      icon={{ source: Icon.ChevronDown }}
                      onAction={ () => moveFeed(index, 1) }
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    />
                  }
                </ActionPanel.Section>
              }
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function FeedStoriesList(props: { feedItem : Feed }) {
  const [stories, setStories] = useState<Story[]>([] as Story[])
  const [loading, setLoading] = useState(false);

  async function fetchStories() {
    setLoading(true)
    setStories(await getStories([ props.feedItem ]))
    setLoading(false)
  }

  useEffect(() => {
    fetchStories();
  }, [])

  return (
    <List isLoading = { loading } >
      {stories.map((story) => (
        <StoryListItem key={ story.guid } item={ story } />
      ))}
    </List>
  )
}

export async function getFeeds() {
  const feedsString = await getLocalStorageItem("feeds") as string
  if (feedsString === undefined) {
    return []
  }
  const feedItems = JSON.parse(feedsString) as Feed[]
  return feedItems
}

export default FeedsList;