import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { EditBookmark } from "@/views/EditBookmarkForm";
import MyAccount from "@/views/MyAccount";
import { Spaces } from "@/views/SpacesView";
import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";
import AddBookmark from "../add-bookmark";
import { cache } from "../utils/cache.util";
import { RankingEntries } from "../types";
import { useEnabledSpaces } from "../hooks/use-enabled-spaces.hook";

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
        onPop={refetch}
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
  refetch: () => void;
  rankingEntries: RankingEntries;
  setRankingEntries: (rankingEntries: RankingEntries | ((prev: RankingEntries) => RankingEntries)) => void;
}) => {
  const { bookmark, refetch, setRankingEntries, rankingEntries } = props;
  const { url } = bookmark;

  const { enabledSpaceIds } = useEnabledSpaces();
  const deleteBookmark = trpc.bookmark.delete.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async () => {
    if (!enabledSpaceIds) {
      return;
    }

    if (
      !(await confirmAlert({
        title: "Delete Bookmark?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    ) {
      return;
    }

    await deleteBookmark.mutateAsync(bookmark.id);

    utils.bookmark.listAll.refetch({ spaceIds: enabledSpaceIds });
    utils.bookmark.listAll.setData({ spaceIds: enabledSpaceIds }, (prev) => {
      if (!prev) return prev;

      return prev.filter((b) => b.id !== bookmark.id);
    });
  };

  const handleResetRanking = async () => {
    const confirmed = await confirmAlert({
      icon: Icon.ArrowCounterClockwise,
      title: "",
      message: `The item will no longer be upranked in search results. Opening the item again will increase its ranking over time.`,
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    setRankingEntries((prev) => {
      const newRankingEntries = { ...prev };
      delete newRankingEntries[bookmark.id];
      return newRankingEntries;
    });
  };

  const createActivity = trpc.activity.create.useMutation();

  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open URL"
        url={url}
        shortcut={Keyboard.Shortcut.Common.Open}
        onOpen={() => {
          const keyword = cache.get("keyword") || "";
          createActivity.mutate({
            type: "BOOKMARK_OPEN",
            spaceId: bookmark.spaceId,
            data: {
              keyword,
              bookmarkId: bookmark.id,
            },
          });

          setRankingEntries((prev) => {
            const existing = prev[bookmark.id];
            if (!existing) {
              return {
                ...prev,
                [bookmark.id]: [{ keyword, count: 1 }],
              };
            }

            const existingKeyword = existing.find((k) => k.keyword === keyword);
            if (!existingKeyword) {
              return {
                ...prev,
                [bookmark.id]: [...existing, { keyword, count: 1 }],
              };
            }

            return {
              ...prev,
              [bookmark.id]: existing.map((k) => (k.keyword === keyword ? { ...k, count: k.count + 1 } : k)),
            };
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

      <Action.Push
        title="Edit Bookmark"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<EditBookmark bookmark={bookmark} refetch={refetch} />}
      />

      {rankingEntries[bookmark.id] && rankingEntries[bookmark.id].length > 0 && (
        <Action
          title={"Reset Ranking"}
          icon={Icon.ArrowCounterClockwise}
          style={Action.Style.Regular}
          onAction={handleResetRanking}
        />
      )}

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
