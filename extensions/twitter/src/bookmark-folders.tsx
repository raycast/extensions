import { withXAuth } from "./v2/lib/with_x_auth";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { TweetList } from "./v2/components/tweet";
import "./v2/components/register-post-views";
import { clientV2 } from "./v2/lib/twitterapi_v2";
import { useTweetPage } from "./v2/lib/tweet-page";
import { deduplicateById } from "./v2/lib/twitter";

function BookmarkFolderPosts({ folderId, folderName }: { folderId: string; folderName: string }) {
  const { tweets, error, isLoading, pagination, fetcher } = useTweetPage(
    (id, cursor) => clientV2.bookmarksInFolder(id, cursor),
    folderId,
    "Could not load folder",
  );

  return (
    <TweetList
      tweets={tweets}
      error={error}
      isLoading={isLoading}
      fetcher={fetcher}
      pagination={pagination}
      searchBarPlaceholder={`Filter ${folderName}...`}
      emptyViewTitle="No Bookmarks Found"
      emptyViewIcon={Icon.Bookmark}
    />
  );
}

function BookmarkFoldersCommand() {
  const { data, error, isLoading, pagination, revalidate } = usePromise(
    () => async (options: { cursor?: string }) => {
      const page = await clientV2.bookmarkFolders(options.cursor);
      return { data: page.items, hasMore: Boolean(page.nextToken), cursor: page.nextToken };
    },
    [],
    { failureToastOptions: { title: "Could not load bookmark folders" } },
  );
  const refresh = async () => {
    clientV2.clearCache();
    await revalidate();
  };
  const refreshAction = (
    <Action
      title="Refresh Folders"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={refresh}
    />
  );

  return (
    <List isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Filter bookmark folders...">
      <List.EmptyView
        title={error ? "Could Not Load Bookmark Folders" : "No Bookmark Folders Found"}
        description={error?.message}
        icon={error ? Icon.ExclamationMark : Icon.Folder}
        actions={<ActionPanel>{refreshAction}</ActionPanel>}
      />
      {deduplicateById(data).map((folder) => (
        <List.Item
          key={folder.id}
          title={folder.name}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Bookmark Folder"
                icon={Icon.Folder}
                target={<BookmarkFolderPosts folderId={folder.id} folderName={folder.name} />}
              />
              {refreshAction}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withXAuth(BookmarkFoldersCommand);
