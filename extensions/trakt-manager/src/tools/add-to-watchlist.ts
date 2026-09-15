import { Action, Tool } from "@raycast/api";
import { addMovieIdToWatchlist, addShowIdToWatchlist } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
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
   * The title of the movie or show, used only for the message reported back to the user.
   * The confirmation dialog always shows the title Trakt holds for `traktId`.
   */
  title: string;
};

type Output = {
  success: boolean;
  message: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const verified = await describeMedia(input.type, input.traktId);

  return {
    style: Action.Style.Regular,
    message: `Add ${verified} to your Trakt watchlist?`,
    info: [
      { name: "Title", value: verified },
      { name: "Type", value: input.type === "movie" ? "Movie" : "TV Show" },
      { name: "Trakt ID", value: String(input.traktId) },
    ],
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
