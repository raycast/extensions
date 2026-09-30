import { Action, Tool } from "@raycast/api";
import { removeEpisodeIdFromHistory, removeMovieIdFromHistory, removeShowIdFromHistory } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { assertSyncFound, readSyncWrite, syncKindForMedia, type SyncKind } from "./sync-write";
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
   * Optional title of the movie, TV show, or episode. Ignored: confirmation always uses
   * the title Trakt holds for `traktId`.
   */
  title?: string;
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

  const verified = await describeMedia(input.type, input.traktId);

  return {
    style: Action.Style.Destructive,
    message: `Remove ${verified} from your Trakt watch history?`,
    info: [
      { name: "Title", value: verified },
      { name: "Type", value: typeMap[input.type] ?? input.type },
      { name: "Trakt ID", value: String(input.traktId) },
    ],
  };
};

/**
 * Remove a movie, TV series, or specific episode from your Trakt watch history.
 * Requires a valid `traktId`.
 * A destructive confirmation dialog is shown to the user before removing the history item.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type, traktId } = input;
  const verified = await describeMedia(type, traktId);
  const kinds: SyncKind[] = type === "show" ? ["shows", "episodes"] : [syncKindForMedia(type)];

  const response = await executeToolCall((signal) => {
    if (type === "movie") return removeMovieIdFromHistory(toolTraktClient, traktId, { signal });
    if (type === "show") return removeShowIdFromHistory(toolTraktClient, traktId, { signal });
    if (type === "episode") return removeEpisodeIdFromHistory(toolTraktClient, traktId, { signal });
    throw new Error(`Unsupported media type "${type}". Use "movie", "show", or "episode".`);
  }, `Failed to remove ${verified} (ID: ${traktId}) from watch history`);
  const result = readSyncWrite(response.body, kinds);
  assertSyncFound(result, verified);

  if (result.known && result.deleted === 0) {
    return {
      success: true,
      message: `${verified} was not in your Trakt watch history. Nothing was removed.`,
    };
  }

  return {
    success: true,
    message: `Successfully removed ${verified} from your Trakt watch history.`,
  };
}
