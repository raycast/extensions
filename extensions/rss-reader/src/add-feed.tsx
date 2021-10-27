import { ActionPanel, Form, SubmitFormAction, showToast, ToastStyle, Icon, Color, getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { useEffect, useState } from "react";
import { Feed } from "./feeds";
import Parser from "rss-parser";

const parser = new Parser({});
  
interface State {
  items?: Feed[];
  error?: Error;
}

export function AddFeedForm() {
  const [state, setState] = useState<State>({});
  const [value, setValue] = useState("");

  async function getFeeds() {
    try {
      const feedsString = await getLocalStorageItem("feeds") as string
      let feeds : Feed[] = []
      
      if (feedsString !== undefined) {
        feeds = JSON.parse(feedsString)
      }

      setState({ 
        items: feeds,
      });
    } catch (error) {
      setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
    }
  }

  useEffect(() => {
    getFeeds();
  }, []);

  const addFeed = async (values: { feedURL : string }) => {
    try {
      setValue("")
      showToast(ToastStyle.Animated, "Subscribing...")
      const feed = await parser.parseURL(values.feedURL)
      let feedItem = ({
        url: values.feedURL,
        title: feed.title!,
        icon: feed.image?.url
      })

      let feedItems = state.items
      if (feedItems?.some(item => item.url === feedItem.url)) {
        await showToast(ToastStyle.Failure, "Feed already exists", feedItem.title);
        return;
      }
      feedItems?.push(feedItem)
      await setLocalStorageItem("feeds", JSON.stringify(feedItems));

      await showToast(ToastStyle.Success, "Subscribed!", feedItem.title);

      setState({
        items: feedItems
      })
    } catch (error) {
      showToast(ToastStyle.Failure, "Can't find feed", "No valid feed found on " + values.feedURL);
    }
  };

  return (
    <Form 
      actions={
        <ActionPanel>
          <SubmitFormAction 
            title="Subscribe" 
            onSubmit={addFeed}
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            shortcut={{ modifiers: [], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField 
        id="feedURL"
        title="RSS Feed URL"
        placeholder="Paste feed URL here and press enter to subscribe"
        value={ value }
        onChange={ setValue }
      />
    </Form>
  );
}

export default AddFeedForm;