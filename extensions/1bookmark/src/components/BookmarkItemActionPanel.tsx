import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { EditBookmark } from "@/views/EditBookmarkForm";
import MyAccount from "@/views/MyAccount";
import { Spaces } from "@/views/SpacesView";
import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";
import AddBookmark from "../add-bookmark";

export const RequiredActions = (props: { refetch: () => void }) => {
  const { refetch } = props;

  return (
    <>
      <Action.Push
        title="Add New Bookmark"
        icon={Icon.Plus}
        target={<AddBookmark onlyPop />}
        onPop={refetch}
        shortcut={Keyboard.Shortcut.Common.New}
      />
      <Action.Push
        title="My Account"
        icon={Icon.Person}
        target={<MyAccount />}
        onPop={refetch}
        shortcut={{ modifiers: ["cmd"], key: "m" }}
      />
      <Action.Push
        title="Spaces"
        icon={Icon.TwoPeople}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        target={<Spaces />}
      />
      {/* TODO: Add this feature later */}
      {/* <Action
        title={'Tags'}
        onAction={() => {
          console.log('Tags management')
        }}
      />*/}
    </>
  );
};

export const BookmarkItemActionPanel = (props: {
  bookmark: RouterOutputs["bookmark"]["listAll"][number];
  me: RouterOutputs["user"]["me"] | undefined;
  toggleBookmarkDetail: () => void;
  refetch: () => void;
}) => {
  const { bookmark, me, refetch } = props;
  const { url } = bookmark;

  const spaceIds = me?.associatedSpaces.map((s) => s.id) || [];
  const deleteBookmark = trpc.bookmark.delete.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Bookmark?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    await deleteBookmark.mutateAsync(bookmark.id);
    utils.bookmark.listAll.setData({ spaceIds }, (prev) => {
      if (!prev) return prev;

      return prev.filter((b) => b.id !== bookmark.id);
    });
    utils.bookmark.listAll.refetch({ spaceIds });
  };

  const createActivity = trpc.activity.create.useMutation();

  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open URL"
        url={url}
        shortcut={Keyboard.Shortcut.Common.Open}
        onOpen={() => {
          createActivity.mutate({
            type: "BOOKMARK_OPEN",
            spaceId: bookmark.spaceId,
            data: { bookmarkId: bookmark.id },
          });
        }}
      />
      <Action.CopyToClipboard
        title="Copy URL to Clipboard"
        content={url}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onCopy={() => {
          createActivity.mutate({
            type: "BOOKMARK_COPY",
            spaceId: bookmark.spaceId,
            data: { bookmarkId: bookmark.id },
          });
        }}
      />

      {/* TODO: Add this feature later */}
      {/* <Action.Push
        title="Copy URL to Other Space"
        icon={Icon.Link}
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
        target={<CopyBookmarkToOtherSpace bookmark={bookmark} />}
      /> */}

      {/* TODO: Add this feature later */}
      {/* <Action title="Show/hide Detail" icon="ℹ️" onAction={toggleBookmarkDetail} /> */}

      <Action.Push
        title="Edit Bookmark"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<EditBookmark bookmark={bookmark} refetch={refetch} />}
      />

      {/* TODO: Add this feature later */}
      {/* <Action
        title={'Pin/unpin Bookmark'}
        icon={Icon.Pin}
        shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
        onAction={() => {
          console.log('pin/unpin')
        }}
      /> */}

      <Action
        title={"Delete Bookmark"}
        icon={Icon.Trash}
        shortcut={Keyboard.Shortcut.Common.Remove}
        style={Action.Style.Destructive}
        onAction={handleDelete}
      />

      {/* TODO: Add this feature later */}
      {/* <Action
        title={'Reset Ranking'}
        icon=""
        onAction={() => {
          console.log('Reset ranking')
        }}
      /> */}

      <ActionPanel.Section>
        <RequiredActions refetch={refetch} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
