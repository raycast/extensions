import {
  ActionPanel,
  Form,
  SubmitFormAction,
  showToast,
  ToastStyle,
  Icon,
  Color,
  setLocalStorageItem,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { Feed, getFeeds } from "./feeds";
import Parser from "rss-parser";

const parser = new Parser({});

function AddFeedForm(props?: { callback?: (feeds: Feed[]) => void }) {
  const [value, setValue] = useState("");
  const { pop } = useNavigation();

  const addFeed = async (values: { feedURL: string }) => {
    try {
      setValue("");
      showToast(ToastStyle.Animated, "Subscribing...");
      const feed = await parser.parseURL(values.feedURL);
      const feedItem = {
        url: values.feedURL,
        title: feed.title || "No Title",
        icon: feed.image?.url || Icon.TextDocument,
      };

      const feedItems = await getFeeds();
      if (feedItems?.some((item) => item.url === feedItem.url)) {
        await showToast(ToastStyle.Failure, "Feed already exists", feedItem.title);
        return;
      }
      feedItems?.push(feedItem);
      await setLocalStorageItem("feeds", JSON.stringify(feedItems));

      await showToast(ToastStyle.Success, "Subscribed!", feedItem.title);
      if (props?.callback) {
        props.callback(feedItems);
        pop();
      }
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
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}

export default AddFeedForm;
