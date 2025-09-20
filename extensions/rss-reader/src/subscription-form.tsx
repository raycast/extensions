import { ActionPanel, Form, showToast, Icon, Color, useNavigation, Action, LocalStorage, Toast } from "@raycast/api";
import { useState } from "react";
import { Feed, getFeeds } from "./feeds";
import Parser from "rss-parser";
import { getFavicon } from "@raycast/utils";
import { StoriesList } from "./stories";

const parser = new Parser({});

const getFeedItem = async (feedURL: string): Promise<Feed> => {
  const feed = await parser.parseURL(feedURL);
  const feedIcon = () => {
    if (feed.image?.url) {
      return feed.image.url;
    } else {
      return getFavicon(feedURL, { fallback: Icon.BlankDocument });
    }
  };
  return {
    url: feedURL,
    link: feed.link,
    title: feed.title || "No Title",
    icon: feedIcon(),
  };
};

function AddFeedForm() {
  const [value, setValue] = useState("");
  const navigation = useNavigation();

  const addFeed = async (values: { feedURL: string }) => {
    try {
      setValue("");
      showToast({
        style: Toast.Style.Animated,
        title: "Subscribing...",
      });
      const feedItem = await getFeedItem(values.feedURL);

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
      navigation.push(<StoriesList feeds={[feedItem]} />);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
