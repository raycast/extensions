import { Action, ActionPanel, Icon } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAddBookmarkToList } from "../apis";
import { useTranslation } from "../hooks/useTranslation";
import { List } from "../types";
import { runWithToast } from "../utils/toast";
import { labelLists } from "../utils/listLabels";

const log = logger.child("[AddToList]");

/**
 * A submenu rather than a pushed view: picking a list is a one-shot choice, and
 * a submenu filters by typing without costing a navigation level.
 *
 * `lists` is passed IN rather than fetched here on purpose. This renders once
 * per bookmark row, so calling useGetAllLists() inside would fire one request
 * per visible bookmark — the same fan-out that made the create forms slow.
 */
export function AddToListSubmenu({
  bookmarkId,
  lists,
  isLoading,
}: {
  bookmarkId: string;
  lists: List[];
  isLoading?: boolean;
}) {
  const { t } = useTranslation();

  const entries = labelLists(lists).sort((a, b) => a.label.localeCompare(b.label));

  const addToList = async (list: List) => {
    await runWithToast({
      loading: { title: t("bookmark.actions.addingToList", { name: list.name }) },
      success: { title: t("bookmark.actions.addedToList", { name: list.name }) },
      failure: { title: t("bookmark.actions.addToListFailed") },
      action: async () => {
        log.info("Adding bookmark to list", { bookmarkId, listId: list.id });
        await fetchAddBookmarkToList(list.id, bookmarkId);
        log.info("Bookmark added to list", { bookmarkId, listId: list.id });
      },
    });
  };

  return (
    <ActionPanel.Submenu
      title={t("bookmark.actions.addToList")}
      icon={Icon.PlusTopRightSquare}
      isLoading={isLoading}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "l" },
        Windows: { modifiers: ["ctrl", "shift"], key: "l" },
      }}
    >
      {entries.map(({ list, label }) => (
        <Action key={list.id} title={label} icon={list.icon || Icon.List} onAction={() => addToList(list)} />
      ))}
    </ActionPanel.Submenu>
  );
}
