import { Detail, showToast, Toast } from "@raycast/api";
import Bookmark from "./dtos/bookmark-dto";
import BookmarkList from "./components/bookmark-list";
import { fetchBookmarks, isGitfoxCliInstalled, gitfoxCliRequiredMessage } from "./utils";
import { usePromise } from "@raycast/utils";

export function fetchRepositories(): Promise<void | Bookmark[]> {
  return fetchBookmarks().catch((error) => {
    const err = error instanceof Error ? error : new Error("Something went wrong");
    showToast(Toast.Style.Failure, err.name, err.message);
  });
}

export default function Command() {
  const { data, isLoading } = usePromise(fetchRepositories);

  if (!data) {
    return <Detail navigationTitle="Loading..." />;
  }

  return (
    <>
      {isGitfoxCliInstalled() ? (
        <BookmarkList bookmarks={data} isLoading={isLoading} />
      ) : (
        <Detail navigationTitle="GitFox CLI not configured" markdown={gitfoxCliRequiredMessage()} />
      )}
    </>
  );
}
