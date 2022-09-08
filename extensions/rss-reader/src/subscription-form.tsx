import { ActionPanel, Form, showToast, Icon, Color, useNavigation, Action, LocalStorage, Toast } from "@raycast/api";
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
      showToast({
        style: Toast.Style.Animated,
        title: "Subscribing...",
      });
      const feed = await parser.parseURL(values.feedURL);
      const feedItem = {
        url: values.feedURL,
        title: feed.title || "No Title",
        icon: feed.image?.url || Icon.BlankDocument,
      };

      const feedItems = await getFeeds();
      if (feedItems?.some((item) => item.url === feedItem.url)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Feed already exists",
          message: feedItem.title,
        });
        return;
      }
      feedItems?.push(feedItem);
      await LocalStorage.setItem("feeds", JSON.stringify(feedItems));

      await showToast({
        style: Toast.Style.Success,
        title: "Subscribed!",
        message: feedItem.title,
      });
      if (props?.callback) {
        props.callback(feedItems);
        pop();
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Can't find feed",
        message: "No valid feed found on " + values.feedURL,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
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
