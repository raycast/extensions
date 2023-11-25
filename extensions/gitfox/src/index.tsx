import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import Bookmark from "./dtos/bookmark-dto";
import BookmarkList from "./components/bookmark-list";
import { fetchBookmarks, isGitfoxCliInstalled, gitfoxCliRequiredMessage } from "./utils";

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
      {isGitfoxCliInstalled() ? (
        <BookmarkList bookmarks={state.items} isLoading={!state.items} />
      ) : (
        <Detail navigationTitle="GitFox CLI not configured" markdown={gitfoxCliRequiredMessage()} />
      )}
    </>
  );
}
