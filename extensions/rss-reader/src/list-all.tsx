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
    setFeeds(await getFeeds())
  } 

  async function fetchStories() {
    if (feeds.length === 0) {
      return
    }
    setLoading(true)
    setStories(await getStories(feeds))
    setLoading(false)
  }

  useEffect(() => {
    fetchFeeds()
  }, []);

  useEffect(() => {
    fetchStories()
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