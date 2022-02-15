import { Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import BookmarkList from "./components/bookmark-list";
import Bookmark from "./dtos/bookmark-dto";
import { fetchBookmarks, isTowerCliInstalled, towerCliRequiredMessage } from "./utils";

interface State {
  items?: Bookmark[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchRepositories() {
      try {
        const bookmarks = await fetchBookmarks();
        setState({ items: bookmarks });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchRepositories();
  }, []);

  return (
    <>
      {isTowerCliInstalled() ? (
        <BookmarkList bookmarks={state.items} />
      ) : (
        <Detail navigationTitle="Tower CLI not installed" markdown={towerCliRequiredMessage()} />
      )}
    </>
  );
}
