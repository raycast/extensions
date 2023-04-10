import { Detail, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import BookmarkList from "./components/bookmark-list";
import Bookmark from "./dtos/bookmark-dto";
import { fetchBookmarks, isTowerCliInstalled, towerCliRequiredMessage } from "./utils";

interface State {
  items?: Bookmark[];
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchRepositories() {
      try {
        const bookmarks = await fetchBookmarks();
        setState({ items: bookmarks });
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Something went wrong");
        showToast(Toast.Style.Failure, err.name, err.message);
      }
    }

    fetchRepositories();
  }, []);

  return (
    <>
      {isTowerCliInstalled() ? (
        <BookmarkList bookmarks={state.items} isLoading={!state.items} />
      ) : (
        <Detail navigationTitle="Tower CLI not installed" markdown={towerCliRequiredMessage()} />
      )}
    </>
  );
}
