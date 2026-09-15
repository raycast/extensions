import { Action, Tool } from "@raycast/api";
import { removeEpisodeIdFromHistory, removeMovieIdFromHistory, removeShowIdFromHistory } from "../lib/media-mutations";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The type of media to remove from watch history: "movie", "show", or "episode".
   */
  type: "movie" | "show" | "episode";
  /**
   * The unique Trakt ID of the movie, TV show, or episode to remove.
   * For an episode, this must be the episode's Trakt ID.
   * Obtain this first from `get-history`, `search-movies`, `search-shows`, or `get-season-episodes`.
   */
  traktId: number;
  /**
   * The title of the movie, TV show, or episode.
   * Required for the confirmation dialog presented to the user.
   */
  title: string;
  /**
   * Optional episode label (e.g. "S01E03") to make the confirmation clearer when removing an episode.
   */
  episodeLabel?: string;
};

type Output = {
  success: boolean;
  message: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const typeMap: Record<string, string> = {
    movie: "Movie",
    show: "Entire TV Show",
    episode: "Episode",
  };

  const labelSuffix = input.episodeLabel ? ` (${input.episodeLabel})` : "";
  const info = [
    { name: "Title", value: input.title },
    { name: "Type", value: typeMap[input.type] ?? input.type },
    { name: "Trakt ID", value: String(input.traktId) },
  ];

  if (input.episodeLabel) {
    info.push({ name: "Episode", value: input.episodeLabel });
  }

  return {
    style: Action.Style.Destructive,
    message: `Remove "${input.title}"${labelSuffix} from your Trakt watch history?`,
    info,
  };
};

/**
 * Remove a movie, TV series, or specific episode from your Trakt watch history.
 * Requires a valid `traktId`.
 * A destructive confirmation dialog is shown to the user before removing the history item.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type, traktId, title, episodeLabel } = input;

  if (type === "movie") {
    await executeToolCall(
      (signal) => removeMovieIdFromHistory(toolTraktClient, traktId, { signal }),
      `Failed to remove movie "${title}" (ID: ${traktId}) from watch history`,
    );
  } else if (type === "show") {
    await executeToolCall(
      (signal) => removeShowIdFromHistory(toolTraktClient, traktId, { signal }),
      `Failed to remove show "${title}" (ID: ${traktId}) from watch history`,
    );
  } else if (type === "episode") {
    await executeToolCall(
      (signal) => removeEpisodeIdFromHistory(toolTraktClient, traktId, { signal }),
      `Failed to remove episode "${title}" (ID: ${traktId}) from watch history`,
    );
  } else {
    throw new Error(`Unsupported media type "${type}". Use "movie", "show", or "episode".`);
  }

  const labelSuffix = episodeLabel ? ` (${episodeLabel})` : "";

  return {
    success: true,
    message: `Successfully removed "${title}"${labelSuffix} from your Trakt watch history.`,
  };
}
