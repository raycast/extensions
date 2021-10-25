import { ActionPanel, List, showToast, ToastStyle, Icon, Color, getLocalStorageItem, setLocalStorageItem, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";

const parser = new Parser({});

interface Feed {
  idx: number;
  url: string;
  title?: string;
  icon?: string
}
  
interface State {
  items?: Feed[];
  error?: Error;
}

export default function FeedsList(props: { callback : () => any }) {
  const { pop } = useNavigation();

  const [state, setState] = useState<State>({});
  const [loading, setLoading] = useState(false);

  async function fetchFeeds() {
    try {
      setLoading(true)
      const feedsString = await getLocalStorageItem("feeds") as string
      let feeds : any
      let feedItems : Feed[] = []
      if (feedsString === undefined) {
        setState({ error : new Error("No feeds to fetch") });
        setLoading(false)
        return;
      }
      feeds = JSON.parse(feedsString)
      if (feeds.urls === undefined || feeds.urls.length == 0) {
        setState({ error : new Error("No feeds to fetch") });
        setLoading(false)
        return;
      }

      for (const feedURL of feeds.urls) {
        const feed = await parser.parseURL(feedURL);
        let feedItem = ({
          idx: feeds.urls.indexOf(feedURL),
          url: feedURL,
          title: feed.title!,
          icon: feed.image?.url
        })
        feedItems.push(feedItem)
      }
      setState({ 
        items: feedItems
      });
      setLoading(false)
    } catch (error) {
      setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
    }
  }

  useEffect(() => {
    fetchFeeds();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading feeds", state.error.message);
  }

  const removeFeed = async (index: number) => {
    const removedFeed = state.items?.at(index)?.title
    state.items?.splice(index, 1)
    let feeds = {
      urls: [] as string[]
    }
    state.items?.map((feed) => {
      feeds.urls.push(feed.url)
    })
    await setLocalStorageItem("feeds", JSON.stringify(feeds));

    await showToast(ToastStyle.Success, "Unsubscribed from the feed!", removedFeed);

    fetchFeeds();
  };

  const back = () => {
    pop()
    props.callback()
  }

  return (
    <List
      isLoading={ loading }
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Return to Stories" onAction={back} shortcut={{ modifiers: [], key: "escape" }}/>
        </ActionPanel>
      }
    >
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