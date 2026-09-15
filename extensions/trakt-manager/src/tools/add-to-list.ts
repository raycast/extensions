import { Action, Tool } from "@raycast/api";
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
  /**
   * Optional titles matching the IDs above, in the same order, separated by a pipe "|".
   * Shown in the confirmation dialog so the user can check what will be added.
   */
  titles?: string;
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

export function parseTraktIds(value?: string): number[] {
  if (!value) return [];

  const ids = value
    .split(/[,;]/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);

  return [...new Set(ids)];
}

export function describeSelection(titles: string | undefined, total: number): string {
  const parsed = (titles ?? "")
    .split("|")
    .map((title) => title.trim())
    .filter(Boolean);

  if (parsed.length === 0) return `${total} item(s)`;
  if (parsed.length <= 5) return parsed.join(", ");
  return `${parsed.slice(0, 5).join(", ")} and ${parsed.length - 5} more`;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const movieCount = parseTraktIds(input.movieTraktIds).length;
  const showCount = parseTraktIds(input.showTraktIds).length;
  const total = movieCount + showCount;

  return {
    style: Action.Style.Regular,
    message: `Add ${total} item(s) to the Trakt list "${input.listName ?? input.listId}"?`,
    info: [
      { name: "List", value: input.listName ?? input.listId },
      { name: "Movies", value: String(movieCount) },
      { name: "TV Shows", value: String(showCount) },
      { name: "Items", value: describeSelection(input.titles, total) },
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
