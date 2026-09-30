import { Detail, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import BookmarkList from "./components/bookmark-list";
import Bookmark from "./dtos/bookmark-dto";
import { fetchBookmarks, isTowerCliInstalled, towerCliRequiredMessage } from "./utils";

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
      {isTowerCliInstalled() ? (
        <BookmarkList bookmarks={data} isLoading={isLoading} />
      ) : (
        <Detail navigationTitle="Tower CLI not installed" markdown={towerCliRequiredMessage()} />
      )}
    </>
  );
}
