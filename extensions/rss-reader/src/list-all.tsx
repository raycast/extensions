import { ActionPanel, List, Icon, Color, PushAction } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStories, Story, StoryListItem } from "./stories"
import { Feed, getFeeds } from "./feeds";
import AddFeedForm from "./subscription-form";

export default function ListAll() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(false);
  
  async function fetchFeeds() {
    console.log("fetching feeds");
    const feedItems = await getFeeds()
    console.log(feedItems.length);
    setFeeds(feedItems)
  } 

  async function fetchStories() {
    if (feeds.length === 0) {
      return
    }
    setLoading(true)
    console.log("fetching stories");
    const storyItems = await getStories(feeds)
    console.log(storyItems.length);
    setStories(storyItems)
    setLoading(false)
  }

  useEffect(() => {
    if (feeds.length === 0) {
      fetchFeeds()
    }
  }, []);

  useEffect(() => {
    if (feeds.length > 0) {
      fetchStories()
    }
  }, [feeds])

  return (
    <List 
      isLoading={ loading } 
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
      { stories.map((story) =>
        <StoryListItem key={ story.guid } item={story} />
      )}
    </List>
  );
}