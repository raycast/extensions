import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  List,
  Icon,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { OPMLFeed } from "./types";
import { parseOPML, fetchOPMLFromURL, getBuiltinFeeds } from "./opml";

export default function ManageSources() {
  const [feeds, setFeeds] = useState<OPMLFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newFeed, setNewFeed] = useState({ title: "", url: "", category: "" });

  const preferences = getPreferenceValues();

  const loadFeeds = async () => {
    setIsLoading(true);
    try {
      // Load from localStorage first
      const stored = await LocalStorage.getItem<string>("custom_feeds");
      if (stored) {
        setFeeds(JSON.parse(stored));
      } else {
        // Use built-in feeds
        setFeeds(getBuiltinFeeds().slice(0, 20));
      }
    } catch (e) {
      setFeeds(getBuiltinFeeds().slice(0, 20));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  const addFeed = async () => {
    if (!newFeed.title || !newFeed.url) {
      showToast({ style: Toast.Style.Failure, title: "Missing fields" });
      return;
    }

    const feed: OPMLFeed = {
      title: newFeed.title,
      url: newFeed.url,
      category: newFeed.category || "Misc",
    };

    const updated = [...feeds, feed];
    setFeeds(updated);
    await LocalStorage.setItem("custom_feeds", JSON.stringify(updated));

    setNewFeed({ title: "", url: "", category: "" });
    setShowForm(false);
    showToast({ style: Toast.Style.Success, title: "Feed added" });
  };

  const removeFeed = async (url: string) => {
    const updated = feeds.filter((f) => f.url !== url);
    setFeeds(updated);
    await LocalStorage.setItem("custom_feeds", JSON.stringify(updated));
    showToast({ style: Toast.Style.Success, title: "Feed removed" });
  };

  const loadFromOPML = async () => {
    if (!preferences.opmlUrl) {
      showToast({
        style: Toast.Style.Failure,
        title: "No OPML URL configured",
      });
      return;
    }

    try {
      const content = await fetchOPMLFromURL(preferences.opmlUrl);
      const parsed = parseOPML(content);
      setFeeds(parsed);
      await LocalStorage.setItem("custom_feeds", JSON.stringify(parsed));
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${parsed.length} feeds`,
      });
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load OPML",
        message: String(e),
      });
    }
  };

  if (showForm) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Add Feed" onSubmit={addFeed} />
            <Action title="Cancel" onAction={() => setShowForm(false)} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="title"
          title="Feed Title"
          placeholder="e.g., Krebs on Security"
          value={newFeed.title}
          onChange={(v) => setNewFeed({ ...newFeed, title: v })}
        />
        <Form.TextField
          id="url"
          title="RSS URL"
          placeholder="https://example.com/feed.xml"
          value={newFeed.url}
          onChange={(v) => setNewFeed({ ...newFeed, url: v })}
        />
        <Form.TextField
          id="category"
          title="Category (optional)"
          placeholder="e.g., Threat Intel"
          value={newFeed.category}
          onChange={(v) => setNewFeed({ ...newFeed, category: v })}
        />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No feeds configured"
        description="Add feeds manually or load from OPML"
      />
      <List.Section title={`${feeds.length} feeds`}>
        {feeds.map((feed, index) => (
          <List.Item
            key={`${feed.url}-${index}`}
            title={feed.title}
            subtitle={feed.category}
            icon={Icon.Link}
            accessories={[{ text: new URL(feed.url).hostname }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={feed.url} />
                <Action
                  title="Remove"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeFeed(feed.url)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Add New Feed"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Add Feed" onAction={() => setShowForm(true)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Load from OPML URL"
          subtitle={preferences.opmlUrl || "Not configured"}
          icon={Icon.Download}
          actions={
            <ActionPanel>
              <Action title="Load Opml" onAction={loadFromOPML} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Reset to Default Feeds"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Reset" onAction={loadFeeds} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
