import { Action, Tool } from "@raycast/api";
import { removeMediaRating } from "../lib/media-mutations";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The type of media whose rating should be removed: "movie", "show", "season", or "episode".
   */
  type: "movie" | "show" | "season" | "episode";
  /**
   * The unique Trakt ID of the media item.
   * Obtain this first from `get-ratings`, `search-movies`, `search-shows`, or `get-season-episodes`.
   */
  traktId: number;
  /**
   * The title of the movie, TV show, or episode.
   * Required for the confirmation dialog presented to the user.
   */
  title: string;
};

type Output = {
  success: boolean;
  message: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const typeMap: Record<string, string> = {
    movie: "Movie",
    show: "TV Show",
    season: "Season",
    episode: "Episode",
  };

  return {
    style: Action.Style.Destructive,
    message: `Remove your rating for "${input.title}" on Trakt?`,
    info: [
      { name: "Title", value: input.title },
      { name: "Type", value: typeMap[input.type] ?? input.type },
      { name: "Trakt ID", value: String(input.traktId) },
    ],
  };
};

/**
 * Remove your rating for a movie, TV show, season, or episode on Trakt.
 * Requires a valid `traktId`.
 * A destructive confirmation dialog is shown to the user before removing the rating.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type, traktId, title } = input;

  await executeToolCall(
    (signal) =>
      removeMediaRating(
        toolTraktClient,
        {
          type,
          traktId,
        },
        { signal },
      ),
    `Failed to remove rating for "${title}" (ID: ${traktId})`,
  );

  return {
    success: true,
    message: `Successfully removed your rating for "${title}".`,
  };
}
