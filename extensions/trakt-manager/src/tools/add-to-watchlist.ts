import { Action, Tool } from "@raycast/api";
import { addMovieIdToWatchlist, addShowIdToWatchlist } from "../lib/media-mutations";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The type of media to add to the watchlist: "movie" or "show".
   */
  type: "movie" | "show";
  /**
   * The unique Trakt ID of the movie or TV show.
   * Obtain this first by calling `search-movies` or `search-shows`.
   */
  traktId: number;
  /**
   * The title of the movie or show.
   * Required for the confirmation dialog presented to the user.
   */
  title: string;
  /**
   * The release year of the movie or show (optional).
   */
  year?: number;
};

type Output = {
  success: boolean;
  message: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const mediaLabel = input.type === "movie" ? "Movie" : "TV Show";
  const info = [
    { name: "Title", value: input.title },
    { name: "Type", value: mediaLabel },
    { name: "Trakt ID", value: String(input.traktId) },
  ];

  if (input.year) {
    info.splice(2, 0, { name: "Year", value: String(input.year) });
  }

  return {
    style: Action.Style.Regular,
    message: `Add "${input.title}" to your Trakt watchlist?`,
    info,
  };
};

/**
 * Add a movie or TV show to your Trakt watchlist.
 * Requires a valid `traktId` obtained from `search-movies` or `search-shows`.
 * A confirmation dialog is shown to the user before adding the item.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type, traktId, title } = input;

  if (type === "movie") {
    await executeToolCall(
      (signal) => addMovieIdToWatchlist(toolTraktClient, traktId, { signal }),
      `Failed to add movie "${title}" (ID: ${traktId}) to watchlist`,
    );
  } else {
    await executeToolCall(
      (signal) => addShowIdToWatchlist(toolTraktClient, traktId, { signal }),
      `Failed to add show "${title}" (ID: ${traktId}) to watchlist`,
    );
  }

  return {
    success: true,
    message: `"${title}" has been successfully added to your Trakt watchlist.`,
  };
}
