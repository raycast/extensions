import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import Bookmark from "./dtos/bookmark-dto";
import BookmarkList from "./components/bookmark-list";
import { fetchBookmarks, isGitfoxCliInstalled, gitfoxCliRequiredMessage } from "./utils";

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
      {isGitfoxCliInstalled() ? (
        <BookmarkList bookmarks={state.items} />
      ) : (
        <Detail navigationTitle="GitFox CLI not installed" markdown={gitfoxCliRequiredMessage()} />
      )}
    </>
  );
}
