import { Action, Tool } from "@raycast/api";
import { getOwnList, resolveListSelection, summarizeLabels } from "./list-api";
import { assertListId } from "./list-matching";
import { assertListRemovalRead, readListWrite, totalCount } from "./list-write";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Trakt ID or slug of the target list. Get it from `get-lists`.
   */
  listId: string;
  /**
   * Optional display name. Ignored: the confirmation looks the list up by `listId` on Trakt.
   */
  listName?: string;
  /**
   * Comma-separated Trakt IDs of the movies to remove, e.g. "329862,16662".
   * Get them from `get-lists` with `includeItems: true` or `itemQuery`.
   */
  movieTraktIds?: string;
  /**
   * Comma-separated Trakt IDs of the TV shows to remove, e.g. "154784,1388".
   */
  showTraktIds?: string;
  /**
   * Comma-separated seasons as "showTraktId:seasonNumber", e.g. "154784:1".
   * `get-lists` returns `showTraktId` and `seasonNumber` for season entries.
   */
  seasons?: string;
  /**
   * Comma-separated episodes as "showTraktId:seasonNumber:episodeNumber", e.g. "154784:1:3".
   */
  episodes?: string;
};

type Output = {
  success: boolean;
  message: string;
  removed: number;
  /** Items that were not on the list, so nothing was removed for them. */
  notOnList: number;
  listItemCount?: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const [list, selection] = await Promise.all([getOwnList(input.listId), resolveListSelection(input)]);
  const { counts } = selection;

  return {
    style: Action.Style.Destructive,
    message: `Remove ${selection.total} item(s) from the Trakt list "${list.name}"?`,
    info: [
      { name: "List", value: list.name },
      { name: "Movies", value: String(counts.movies) },
      { name: "TV Shows", value: String(counts.shows) },
      { name: "Seasons", value: String(counts.seasons) },
      { name: "Episodes", value: String(counts.episodes) },
      { name: "Items", value: summarizeLabels(selection.labels) },
    ],
  };
};

/**
 * Remove movies, TV shows, seasons and episodes from one of your Trakt personal lists.
 * A destructive confirmation dialog is shown before anything is removed.
 */
export default async function tool(input: Input): Promise<Output> {
  const listId = assertListId(input.listId);
  const [list, selection] = await Promise.all([getOwnList(listId), resolveListSelection(input)]);

  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.users.removeListItems({
        params: { id: "me", listId },
        body: selection.body,
        fetchOptions: { signal },
      }),
    `Failed to remove items from the list "${list.name}"`,
  );

  const result = readListWrite(res.body);
  assertListRemovalRead(result, list.name);

  const removed = totalCount(result.deleted);
  const notOnList = Math.max(selection.total - removed, totalCount(result.notFound));

  const message =
    removed === 0
      ? `None of the ${selection.total} item(s) were on "${list.name}". Nothing was removed.`
      : notOnList > 0
        ? `Removed ${removed} item(s) from "${list.name}". ${notOnList} were not on the list.`
        : `Removed ${removed} item(s) from "${list.name}".`;

  return {
    success: true,
    message,
    removed,
    notOnList,
    listItemCount: result.listItemCount,
  };
}
