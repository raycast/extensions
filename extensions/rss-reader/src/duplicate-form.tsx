import { ActionPanel, Form, showToast, Icon, Color, useNavigation, Action, LocalStorage, Toast } from "@raycast/api";
import { useState } from "react";
import { Feed, getFeeds } from "./feeds";

function DuplicateFeedForm({ feed }: { feed: Feed }) {
  const [url, setUrl] = useState(feed.url);
  const [title, setTitle] = useState(feed.title);
  const navigation = useNavigation();

  const duplicateFeed = async () => {
    if (!url.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "URL is required",
      });
      return;
    }

    const feeds = await getFeeds();

    // Check if URL already exists (compare trimmed value; saved URL uses trim)
    if (feeds.some((f) => f.url === url.trim())) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Feed with this URL already exists",
      });
      return;
    }

    // Create new feed with modified URL/title
    const newFeed: Feed = {
      ...feed,
      url: url.trim(),
      title: title.trim() || feed.title,
      originalTitle: undefined,
    };

    feeds.push(newFeed);
    await LocalStorage.setItem("feeds", JSON.stringify(feeds));

    await showToast({
      style: Toast.Style.Success,
      title: "Feed duplicated!",
      message: newFeed.title,
    });

    navigation.pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Duplicate Feed"
            onSubmit={duplicateFeed}
            icon={{ source: Icon.Duplicate, tintColor: Color.Green }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Duplicate this subscription with a modified URL. Useful for similar feeds with different slugs." />
      <Form.TextField
        id="url"
        title="Feed URL"
        placeholder="https://example.com/feed.xml"
        value={url}
        onChange={setUrl}
      />
      <Form.TextField id="title" title="Title" placeholder={feed.title} value={title} onChange={setTitle} />
    </Form>
  );
}

export default DuplicateFeedForm;
