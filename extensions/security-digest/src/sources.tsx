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
import { useEffect, useState, useMemo } from "react";
import { OPMLFeed } from "./types";
import { parseOPML, fetchOPMLFromURL, getBuiltinFeeds } from "./opml";
import { t, Language } from "./i18n";

export default function ManageSources() {
  const [feeds, setFeeds] = useState<OPMLFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newFeed, setNewFeed] = useState({ title: "", url: "", category: "" });

  const preferences = useMemo(() => getPreferenceValues(), []);
  const lang = preferences.language as Language;

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
      showToast({
        style: Toast.Style.Failure,
        title: t("sources_toast_missing", undefined, lang),
      });
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
    showToast({
      style: Toast.Style.Success,
      title: t("sources_toast_added", undefined, lang),
    });
  };

  const removeFeed = async (url: string) => {
    const updated = feeds.filter((f) => f.url !== url);
    setFeeds(updated);
    await LocalStorage.setItem("custom_feeds", JSON.stringify(updated));
    showToast({
      style: Toast.Style.Success,
      title: t("sources_toast_removed", undefined, lang),
    });
  };

  const loadFromOPML = async () => {
    if (!preferences.opmlUrl) {
      showToast({
        style: Toast.Style.Failure,
        title: t("sources_toast_no_url", undefined, lang),
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
        title: t("sources_toast_loaded", { count: parsed.length }, lang),
      });
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: t("sources_toast_fail", undefined, lang),
        message: String(e),
      });
    }
  };

  if (showForm) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={t("sources_save_btn", undefined, lang)}
              onSubmit={addFeed}
            />
            <Action
              title={t("sources_cancel_btn", undefined, lang)}
              onAction={() => setShowForm(false)}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="title"
          title={t("sources_feed_name", undefined, lang)}
          placeholder={t("sources_name_placeholder", undefined, lang)}
          value={newFeed.title}
          onChange={(v) => setNewFeed({ ...newFeed, title: v })}
        />
        <Form.TextField
          id="url"
          title={t("sources_feed_url", undefined, lang)}
          placeholder={t("sources_url_placeholder", undefined, lang)}
          value={newFeed.url}
          onChange={(v) => setNewFeed({ ...newFeed, url: v })}
        />
        <Form.TextField
          id="category"
          title={t("sources_feed_category", undefined, lang)}
          placeholder={t("sources_cat_placeholder", undefined, lang)}
          value={newFeed.category}
          onChange={(v) => setNewFeed({ ...newFeed, category: v })}
        />
      </Form>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t("sources_search_placeholder", undefined, lang)}
      navigationTitle={t("sources_title", undefined, lang)}
    >
      <List.EmptyView
        title={t("sources_empty_title", undefined, lang)}
        description={t("sources_empty_desc", undefined, lang)}
      />
      <List.Section title={t("items_count", { count: feeds.length }, lang)}>
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
                  title={t("sources_action_remove", undefined, lang)}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeFeed(feed.url)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title={t("sources_section_actions", undefined, lang)}>
        <List.Item
          title={t("sources_add_title", undefined, lang)}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title={t("sources_add_title", undefined, lang)}
                onAction={() => setShowForm(true)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={t("sources_load_opml", undefined, lang)}
          subtitle={
            preferences.opmlUrl || t("sources_not_configured", undefined, lang)
          }
          icon={Icon.Download}
          actions={
            <ActionPanel>
              <Action
                title={t("sources_btn_load_opml", undefined, lang)}
                onAction={loadFromOPML}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={t("sources_reset_btn", undefined, lang)}
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action
                title={t("action_refresh", undefined, lang)}
                onAction={loadFeeds}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
