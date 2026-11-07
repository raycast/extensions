import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import ConnectAccount from "./connect-account";
import { getWebCullPreferences } from "./lib/preferences";
import { WebCullAuthError } from "./lib/http";
import { getCapabilityState, saveBookmark, searchWebCullBookmarks } from "./lib/webcullClient";
import { WebCullBookmark, WebCullCapabilityState } from "./types";

export default function SearchBookmarks() {
  const preferences = getWebCullPreferences();
  const [query, setQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<WebCullBookmark[]>([]);
  const [capabilities, setCapabilities] = useState<WebCullCapabilityState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupAttempt, setSetupAttempt] = useState(0);
  const [needsReauth, setNeedsReauth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setSetupError(null);
      setNeedsReauth(false);
      setCapabilities(null);
      try {
        const nextCapabilities = await getCapabilityState();
        if (cancelled) return;
        setCapabilities(nextCapabilities);
      } catch (error) {
        if (cancelled) return;
        setSetupError(error instanceof Error ? error.message : "Unknown error");
        setNeedsReauth(error instanceof WebCullAuthError);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load WebCull bookmarks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setupAttempt]);

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
      setSetupError(null);
      try {
        const results = await searchWebCullBookmarks(preferences, query);
        if (!cancelled) setBookmarks(results);
      } catch (error) {
        if (cancelled) return;
        setBookmarks([]);
        setSetupError(error instanceof Error ? error.message : "Unknown error");
        if (error instanceof WebCullAuthError) {
          setNeedsReauth(true);
          setCapabilities(null);
        }
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

  const reconnect = needsReauth || capabilities?.needsAuth;

  if (capabilities && !capabilities.bookmarksSearch && !reconnect) {
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
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search title, URL, notes, or tags"
      throttle
    >
      {reconnect || setupError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={reconnect ? "Reconnect WebCull to Continue" : "Could not load WebCull bookmarks"}
          description={setupError || capabilities?.reason}
          actions={
            <ActionPanel>
              {reconnect ? (
                <Action.Push
                  title="Reconnect WebCull"
                  target={
                    <ConnectAccount
                      reauthorize
                      onConnected={() => setSetupAttempt((attempt) => attempt + 1)}
                    />
                  }
                />
              ) : (
                <Action title="Retry" onAction={() => setSetupAttempt((attempt) => attempt + 1)} />
              )}
            </ActionPanel>
          }
        />
      ) : !query.trim() ? (
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
          actions={
            <BookmarkActions
              bookmark={bookmark}
              onAuthError={() => {
                setBookmarks([]);
                setCapabilities(null);
                setNeedsReauth(true);
              }}
            />
          }
        />
      ))}
    </List>
  );
}

function BookmarkActions({
  bookmark,
  onAuthError,
}: {
  bookmark: WebCullBookmark;
  onAuthError: () => void;
}) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open URL" url={bookmark.url} />
      <Action.OpenInBrowser title="Open Parent Folder in WebCull" url={bookmark.webcullUrl} />
      <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
      <Action.CopyToClipboard title="Copy WebCull Folder Link" content={bookmark.webcullUrl} />
      <Action
        title="Save Clipboard URL to This Stack"
        icon={Icon.PlusCircle}
        onAction={() => saveClipboardUrlToStack(bookmark, onAuthError)}
      />
    </ActionPanel>
  );
}

async function saveClipboardUrlToStack(bookmark: WebCullBookmark, onAuthError: () => void) {
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
    await saveBookmark(preferences, {
      accountId: bookmark.accountId,
      parentStackId: bookmark.parentStackId,
      url,
      title: url,
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Saved to WebCull",
      message: bookmark.parentStackPath,
    });
  } catch (error) {
    if (error instanceof WebCullAuthError) onAuthError();
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not save to WebCull",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
