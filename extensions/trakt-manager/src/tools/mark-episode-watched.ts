import { Action, Tool } from "@raycast/api";
import { addEpisodeIdToHistory } from "../lib/media-mutations";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The Trakt ID of the TV show.
   * Obtain this first from `get-up-next` or `search-shows`.
   */
  showTraktId: number;
  /**
   * The title of the TV show (e.g. "Severance", "Breaking Bad").
   * Required for the confirmation dialog presented to the user.
   */
  showTitle: string;
  /**
   * The season number (e.g. 1 for Season 1).
   */
  seasonNumber: number;
  /**
   * The episode number within the season (e.g. 3 for Episode 3).
   */
  episodeNumber: number;
  /**
   * The title of the episode (optional).
   */
  episodeTitle?: string;
  /**
   * The specific Trakt ID of the episode if already known (e.g. from `get-up-next`).
   * If not provided, the tool will automatically resolve it.
   */
  episodeTraktId?: number;
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

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const s = String(input.seasonNumber).padStart(2, "0");
  const e = String(input.episodeNumber).padStart(2, "0");
  const epLabel = input.episodeTitle ? ` "${input.episodeTitle}"` : "";

  const info = [
    { name: "Show", value: input.showTitle },
    { name: "Episode", value: `S${s}E${e}${epLabel}` },
  ];

  return {
    style: Action.Style.Regular,
    message: `Mark S${s}E${e} of "${input.showTitle}" as watched on Trakt?`,
    info,
  };
};

/**
 * Mark a single TV show episode as watched in your Trakt history.
 * If you do not have the episode's Trakt ID, supply `showTraktId`, `seasonNumber`, and `episodeNumber`.
 * A confirmation dialog is shown to the user before recording the watch.
 */
export default async function tool(input: Input): Promise<Output> {
  const { showTraktId, showTitle, seasonNumber, episodeNumber, watchedAt } = input;
  let resolvedEpisodeId = input.episodeTraktId;

  if (!resolvedEpisodeId) {
    const episodeResponse = await executeToolCall(
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
      `Failed to find episode S${seasonNumber}E${episodeNumber} for show "${showTitle}" (ID: ${showTraktId})`,
    );

    resolvedEpisodeId = episodeResponse.body.ids.trakt;
  }

  await executeToolCall(
    (signal) => addEpisodeIdToHistory(toolTraktClient, resolvedEpisodeId!, { signal, watchedAt }),
    `Failed to mark episode S${seasonNumber}E${episodeNumber} (ID: ${resolvedEpisodeId}) as watched`,
  );

  const s = String(seasonNumber).padStart(2, "0");
  const e = String(episodeNumber).padStart(2, "0");

  return {
    success: true,
    message: `"${showTitle}" S${s}E${e} has been successfully marked as watched in your Trakt history.`,
    episodeTraktId: resolvedEpisodeId,
  };
}
