import { Action, Tool } from "@raycast/api";
import { describeSelection, parseTraktIds } from "./add-to-list";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Trakt ID or slug of the target list.
   */
  listId: string;
  /**
   * Name of the list, used for the confirmation dialog.
   */
  listName?: string;
  /**
   * Comma-separated Trakt IDs of the movies to remove, e.g. "329862,16662".
   * Get them from `get-lists` with `includeItems: true`.
   */
  movieTraktIds?: string;
  /**
   * Comma-separated Trakt IDs of the TV shows to remove, e.g. "154784,1388".
   */
  showTraktIds?: string;
  /**
   * Optional titles matching the IDs above, in the same order, separated by a pipe "|".
   * Shown in the confirmation dialog so the user can check what will be removed.
   */
  titles?: string;
};

type Output = {
  success: boolean;
  message: string;
  removedMovies: number;
  removedShows: number;
  /**
   * Items Trakt could not find in the list.
   */
  notFound: number;
  listItemCount?: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const movieCount = parseTraktIds(input.movieTraktIds).length;
  const showCount = parseTraktIds(input.showTraktIds).length;
  const total = movieCount + showCount;

  return {
    style: Action.Style.Destructive,
    message: `Remove ${total} item(s) from the Trakt list "${input.listName ?? input.listId}"?`,
    info: [
      { name: "List", value: input.listName ?? input.listId },
      { name: "Movies", value: String(movieCount) },
      { name: "TV Shows", value: String(showCount) },
      { name: "Items", value: describeSelection(input.titles, total) },
    ],
  };
};

/**
 * Remove movies and TV shows from one of your Trakt personal lists.
 * A destructive confirmation dialog is shown before anything is removed.
 */
export default async function tool(input: Input): Promise<Output> {
  const { listId, listName } = input;

  if (!listId) {
    throw new Error("A listId is required. Use `get-lists` to obtain one.");
  }

  const movieIds = parseTraktIds(input.movieTraktIds);
  const showIds = parseTraktIds(input.showTraktIds);

  if (movieIds.length === 0 && showIds.length === 0) {
    throw new Error("Provide at least one valid Trakt ID in `movieTraktIds` or `showTraktIds`.");
  }

  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.users.removeListItems({
        params: { id: "me", listId: String(listId) },
        body: {
          movies: movieIds.length > 0 ? movieIds.map((id) => ({ ids: { trakt: id } })) : undefined,
          shows: showIds.length > 0 ? showIds.map((id) => ({ ids: { trakt: id } })) : undefined,
        },
        fetchOptions: { signal },
      }),
    `Failed to remove items from the list "${listName ?? listId}"`,
  );

  const body = res.body;
  const removedMovies = body.deleted?.movies ?? 0;
  const removedShows = body.deleted?.shows ?? 0;
  const notFound = (body.not_found?.movies?.length ?? 0) + (body.not_found?.shows?.length ?? 0);

  const parts = [`Removed ${removedMovies + removedShows} item(s) from "${listName ?? listId}".`];
  if (notFound > 0) parts.push(`${notFound} were not present in the list.`);

  return {
    success: true,
    message: parts.join(" "),
    removedMovies,
    removedShows,
    notFound,
    listItemCount: body.list?.item_count,
  };
}
