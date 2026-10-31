import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import ConnectAccount from "./connect-account";
import { getWebCullPreferences } from "./lib/preferences";
import { getCapabilityState, saveBookmark, searchWebCullBookmarks } from "./lib/webcullClient";
import { WebCullBookmark, WebCullCapabilityState } from "./types";

export default function SearchBookmarks() {
  const preferences = getWebCullPreferences();
  const [query, setQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<WebCullBookmark[]>([]);
  const [capabilities, setCapabilities] = useState<WebCullCapabilityState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const nextCapabilities = await getCapabilityState();
        setCapabilities(nextCapabilities);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load WebCull bookmarks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function search() {
      if (!capabilities?.bookmarksSearch || !query.trim()) {
        setBookmarks([]);
        if (capabilities) setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setBookmarks([]);
      try {
        const results = await searchWebCullBookmarks(preferences, query);
        if (!cancelled) setBookmarks(results);
      } catch (error) {
        if (cancelled) return;
        setBookmarks([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not search WebCull",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    search();
    return () => {
      cancelled = true;
    };
  }, [query, capabilities?.bookmarksSearch]);

  if (capabilities?.needsAuth) {
    return <ConnectAccount />;
  }

  if (capabilities && !capabilities.bookmarksSearch) {
    return (
      <List>
        <List.EmptyView
          icon={capabilities.e2eeEnabled ? Icon.Lock : Icon.ExclamationMark}
          title="WebCull search is unavailable"
          description={capabilities.reason || "Search is not enabled for this account."}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search title, URL, notes, or tags"
      throttle
    >
      {!query.trim() ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Your WebCull Bookmarks"
          description="Type search terms, or use filters such as title:example. Results are limited to 25."
        />
      ) : null}
      {bookmarks.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          id={bookmark.id}
          icon={Icon.Bookmark}
          title={bookmark.title || bookmark.url}
          subtitle={bookmark.url}
          accessories={[{ text: bookmark.parentStackPath }]}
          keywords={[bookmark.url, bookmark.parentStackPath, ...(bookmark.tags || [])]}
          actions={<BookmarkActions bookmark={bookmark} />}
        />
      ))}
    </List>
  );
}

function BookmarkActions({ bookmark }: { bookmark: WebCullBookmark }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open URL" url={bookmark.url} />
      <Action.OpenInBrowser title="Open Parent Folder in WebCull" url={bookmark.webcullUrl} />
      <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
      <Action.CopyToClipboard title="Copy WebCull Folder Link" content={bookmark.webcullUrl} />
      <Action
        title="Save Clipboard URL to This Stack"
        icon={Icon.PlusCircle}
        onAction={() => saveClipboardUrlToStack(bookmark)}
      />
    </ActionPanel>
  );
}

async function saveClipboardUrlToStack(bookmark: WebCullBookmark) {
  const preferences = getWebCullPreferences();
  const text = await Clipboard.readText();
  const url = String(text || "").trim();

  if (!url) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
    });
    return;
  }

  try {
    await saveBookmark(preferences, { parentStackId: bookmark.parentStackId, url, title: url });
    await showToast({
      style: Toast.Style.Success,
      title: "Saved to WebCull",
      message: bookmark.parentStackPath,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not save to WebCull",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
