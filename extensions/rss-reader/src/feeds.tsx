import { ActionPanel, List, showToast, ToastStyle, Icon, Color, setLocalStorageItem } from "@raycast/api";
import { useState } from "react";
import { State as IndexState} from "./index";

export interface Feed {
  url: string;
  title?: string;
  icon?: string
}
  
interface State {
  feeds?: Feed[];
  error?: Error;
}

export function FeedsList(props: { indexState: IndexState, callback: (indexState: IndexState) => any }) {
  const [state, setState] = useState<State>({feeds: props.indexState.feeds});

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading feeds", state.error.message);
  }

  const removeFeed = async (index: number) => {
    const removedFeed = state.feeds?.at(index)
    let feedItems = state.feeds
    feedItems?.splice(index, 1)
    await setLocalStorageItem("feeds", JSON.stringify(feedItems));

    setState({
      feeds: feedItems
    })

    await showToast(ToastStyle.Success, "Unsubscribed from the feed!", removedFeed?.title);

    let stories = props.indexState.stories?.filter(story => story.fromFeed != removedFeed?.url)
    props.callback({
      feeds: feedItems,
      stories: stories,
      lastViewed: props.indexState.lastViewed
    })
  };

  return (
    <List>
      { ( state.feeds === undefined || state.feeds.length === 0 ) && (
        <List.Item 
          key="empty"
          title="No feeds"
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
        />
      )}
      {state.feeds?.map((item, index) => (
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