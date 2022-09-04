import { Action, ActionPanel, Detail, Image, List, showToast, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState, useEffect } from "react";
import { getBookmarks, extractDomainName, Bookmark } from "./utils";
import { join } from "path";
import { homedir } from "os";

interface State {
  bookmarks?: Bookmark[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchBookmarks() {
      try {
        const bookmarks = await getBookmarks();
        setState({ bookmarks });
      } catch (e) {
        setState({ error: e instanceof Error ? e : new Error("Something went wrong") });
      }
    }
    fetchBookmarks();
  }, []);

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading bookmarks",
      message: state.error.message,
    });
  }

  return (
    <List
      isLoading={state.bookmarks === undefined && !state.error}
      searchBarPlaceholder="Search by title, domain name, or folder"
    >
      {state.bookmarks?.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          icon={getFavicon(bookmark.url)}
          title={bookmark.title}
          subtitle={extractDomainName(bookmark.url)}
          keywords={bookmark.folders.concat([extractDomainName(bookmark.url)])}
          accessories={bookmark.folders.map(folder => ({ text: folder }))}
          actions={
          <ActionPanel title={bookmark.url}>
            <Action.OpenInBrowser url={bookmark.url} />
            <Action.CopyToClipboard
              title="Copy URL to Clipboard"
              content={bookmark.url}
            />
          </ActionPanel>
        }
        />
      ))}
    </List>
  );
}
