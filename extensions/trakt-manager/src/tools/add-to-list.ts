import { Action, Tool } from "@raycast/api";
import { getOwnList, resolveListSelection, summarizeLabels } from "./list-api";
import { assertListId } from "./list-matching";
import { assertListAdded, readListWrite, totalCount } from "./list-write";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Trakt ID or slug of the target list. Get it from `create-list` or `get-lists`.
   */
  listId: string;
  /**
   * Optional display name. Ignored: the confirmation looks the list up by `listId` on Trakt.
   */
  listName?: string;
  /**
   * Comma-separated Trakt IDs of the movies to add, e.g. "329862,16662,355370".
   * Put EVERY movie in this one field; never call this tool once per movie.
   */
  movieTraktIds?: string;
  /**
   * Comma-separated Trakt IDs of the TV shows to add, e.g. "154784,1388".
   */
  showTraktIds?: string;
  /**
   * Comma-separated seasons as "showTraktId:seasonNumber", e.g. "154784:1,1388:2".
   * Seasons are addressed through their show; never pass a bare season ID.
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
  added: number;
  /** Items that were already on the list and were left as they were. */
  alreadyPresent: number;
  /** Items Trakt could not match. */
  notFound: number;
  listItemCount?: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const [list, selection] = await Promise.all([getOwnList(input.listId), resolveListSelection(input)]);
  const { counts } = selection;

  return {
    style: Action.Style.Regular,
    message: `Add ${selection.total} item(s) to the Trakt list "${list.name}"?`,
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
 * Add movies, TV shows, seasons and episodes to one of your Trakt personal lists.
 * Batch every title into a SINGLE call with comma-separated values instead of calling this
 * tool once per title.
 */
export default async function tool(input: Input): Promise<Output> {
  const listId = assertListId(input.listId);
  const [list, selection] = await Promise.all([getOwnList(listId), resolveListSelection(input)]);

  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.users.addListItems({
        params: { id: "me", listId },
        body: selection.body,
        fetchOptions: { signal },
      }),
    `Failed to add items to the list "${list.name}"`,
  );

  const result = readListWrite(res.body);
  assertListAdded(result, list.name);

  const added = totalCount(result.added);
  const alreadyPresent = totalCount(result.existing);
  const notFound = totalCount(result.notFound);

  const parts = [`Added ${added} item(s) to "${list.name}".`];
  if (alreadyPresent > 0) parts.push(`${alreadyPresent} were already on the list.`);
  if (notFound > 0) parts.push(`${notFound} could not be matched on Trakt and were skipped.`);
  const unaccounted = selection.total - added - alreadyPresent - notFound;
  if (unaccounted > 0) parts.push(`Trakt did not report on ${unaccounted} item(s); check the list before retrying.`);

  return {
    success: true,
    message: parts.join(" "),
    added,
    alreadyPresent,
    notFound,
    listItemCount: result.listItemCount,
  };
}
