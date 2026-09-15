import { Action, Tool } from "@raycast/api";
import { describeList, parseTraktIds } from "./list-matching";
import { describeMediaBatch } from "./resolve-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Trakt ID or slug of the target list.
   * Get it from `create-list` or `get-lists`.
   */
  listId: string;
  /**
   * Name of the list, used for the confirmation dialog.
   */
  listName?: string;
  /**
   * Comma-separated Trakt IDs of the movies to add, e.g. "329862,16662,355370".
   * Put EVERY movie in this one field; never call this tool once per movie.
   */
  movieTraktIds?: string;
  /**
   * Comma-separated Trakt IDs of the TV shows to add, e.g. "154784,1388".
   * Put EVERY show in this one field; never call this tool once per show.
   */
  showTraktIds?: string;
};

type Output = {
  success: boolean;
  message: string;
  addedMovies: number;
  addedShows: number;
  /**
   * Items that were already in the list and were skipped.
   */
  alreadyPresent: number;
  /**
   * Items Trakt could not match, meaning a Trakt ID was wrong.
   */
  notFound: number;
  listItemCount?: number;
};

/**
 * Turn the IDs that will actually be written into a readable summary, resolving each one
 * against Trakt so the confirmation cannot name a different item than the one being added.
 */
export async function summarizeSelection(movieIds: number[], showIds: number[]): Promise<string> {
  const total = movieIds.length + showIds.length;
  if (total === 0) return "nothing";

  const [movies, shows] = await Promise.all([
    describeMediaBatch("movie", movieIds),
    describeMediaBatch("show", showIds),
  ]);

  const labels = [...movies.labels, ...shows.labels];
  const remaining = movies.remaining + shows.remaining;

  if (labels.length === 0) return `${total} item(s)`;
  return remaining > 0 ? `${labels.join(", ")} and ${remaining} more` : labels.join(", ");
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const movieIds = parseTraktIds(input.movieTraktIds);
  const showIds = parseTraktIds(input.showTraktIds);
  const total = movieIds.length + showIds.length;

  const [listName, items] = await Promise.all([describeList(input.listId), summarizeSelection(movieIds, showIds)]);

  return {
    style: Action.Style.Regular,
    message: `Add ${total} item(s) to the Trakt list "${listName}"?`,
    info: [
      { name: "List", value: listName },
      { name: "Movies", value: String(movieIds.length) },
      { name: "TV Shows", value: String(showIds.length) },
      { name: "Items", value: items },
    ],
  };
};

/**
 * Add movies and TV shows to one of your Trakt personal lists.
 * Batch every title into a SINGLE call by passing comma-separated Trakt IDs,
 * instead of calling this tool once per title.
 */
export default async function tool(input: Input): Promise<Output> {
  const { listId, listName } = input;

  if (!listId) {
    throw new Error("A listId is required. Use `get-lists` or `create-list` to obtain one.");
  }

  const movieIds = parseTraktIds(input.movieTraktIds);
  const showIds = parseTraktIds(input.showTraktIds);

  if (movieIds.length === 0 && showIds.length === 0) {
    throw new Error("Provide at least one valid Trakt ID in `movieTraktIds` or `showTraktIds`.");
  }

  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.users.addListItems({
        params: { id: "me", listId: String(listId) },
        body: {
          movies: movieIds.length > 0 ? movieIds.map((id) => ({ ids: { trakt: id } })) : undefined,
          shows: showIds.length > 0 ? showIds.map((id) => ({ ids: { trakt: id } })) : undefined,
        },
        fetchOptions: { signal },
      }),
    `Failed to add items to the list "${listName ?? listId}"`,
  );

  const body = res.body;
  const addedMovies = body.added?.movies ?? 0;
  const addedShows = body.added?.shows ?? 0;
  const alreadyPresent = (body.existing?.movies ?? 0) + (body.existing?.shows ?? 0);
  const notFound = (body.not_found?.movies?.length ?? 0) + (body.not_found?.shows?.length ?? 0);

  const parts = [`Added ${addedMovies + addedShows} item(s) to "${listName ?? listId}".`];
  if (alreadyPresent > 0) parts.push(`${alreadyPresent} were already in the list.`);
  if (notFound > 0) parts.push(`${notFound} could not be matched on Trakt and were skipped.`);

  return {
    success: true,
    message: parts.join(" "),
    addedMovies,
    addedShows,
    alreadyPresent,
    notFound,
    listItemCount: body.list?.item_count,
  };
}
