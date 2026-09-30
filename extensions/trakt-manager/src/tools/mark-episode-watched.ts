import { Action, Tool } from "@raycast/api";
import { addEpisodeIdToHistory } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { assertSyncAdded, readSyncWrite } from "./sync-write";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The Trakt ID of the TV show.
   * Obtain this first from `get-up-next` or `search-shows`.
   */
  showTraktId: number;
  /**
   * Optional title of the TV show. Ignored: confirmation always uses the title Trakt
   * holds for `showTraktId`.
   */
  showTitle?: string;
  /**
   * The season number (e.g. 1 for Season 1).
   */
  seasonNumber: number;
  /**
   * The episode number within the season (e.g. 3 for Episode 3).
   */
  episodeNumber: number;
  /**
   * Optional watched date in ISO format (e.g. "2026-09-15T12:00:00Z").
   * Defaults to current timestamp if omitted.
   */
  watchedAt?: string;
};

type Output = {
  success: boolean;
  message: string;
  episodeTraktId: number;
};

function episodeCode(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
}

/**
 * Resolve the episode from the show, season and episode numbers.
 *
 * The episode ID is always derived from these three values rather than accepted from the
 * caller, so the episode written to the history is necessarily the one named in the
 * confirmation dialog.
 */
async function resolveEpisode(showTraktId: number, seasonNumber: number, episodeNumber: number) {
  const response = await executeToolCall(
    (signal) =>
      toolTraktClient.shows.getEpisode({
        params: {
          showid: showTraktId,
          seasonNumber,
          episodeNumber,
        },
        query: {
          extended: "full",
        },
        fetchOptions: { signal },
      }),
    `Failed to find episode ${episodeCode(seasonNumber, episodeNumber)} for the show with Trakt ID ${showTraktId}`,
  );

  return response.body;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const code = episodeCode(input.seasonNumber, input.episodeNumber);
  const [showLabel, episode] = await Promise.all([
    describeMedia("show", input.showTraktId),
    resolveEpisode(input.showTraktId, input.seasonNumber, input.episodeNumber),
  ]);

  return {
    style: Action.Style.Regular,
    message: `Mark ${code} of ${showLabel} as watched on Trakt?`,
    info: [
      { name: "Show", value: showLabel },
      { name: "Episode", value: episode.title ? `${code} "${episode.title}"` : code },
      { name: "Trakt ID", value: String(episode.ids.trakt) },
    ],
  };
};

/**
 * Mark a single TV show episode as watched in your Trakt history.
 * Supply `showTraktId`, `seasonNumber` and `episodeNumber`; the episode is resolved from them.
 * A confirmation dialog is shown to the user before recording the watch.
 */
export default async function tool(input: Input): Promise<Output> {
  const { showTraktId, seasonNumber, episodeNumber, watchedAt } = input;
  const code = episodeCode(seasonNumber, episodeNumber);
  const [showLabel, episode] = await Promise.all([
    describeMedia("show", showTraktId),
    resolveEpisode(showTraktId, seasonNumber, episodeNumber),
  ]);
  const episodeLabel = episode.title ? `${code} "${episode.title}"` : code;

  const response = await executeToolCall(
    (signal) => addEpisodeIdToHistory(toolTraktClient, episode.ids.trakt, { signal, watchedAt }),
    `Failed to mark ${episodeLabel} of ${showLabel} (ID: ${episode.ids.trakt}) as watched`,
  );
  assertSyncAdded(readSyncWrite(response.body, "episodes"), `${showLabel} ${episodeLabel}`);

  return {
    success: true,
    message: `${showLabel} ${episodeLabel} has been successfully marked as watched in your Trakt history.`,
    episodeTraktId: episode.ids.trakt,
  };
}
