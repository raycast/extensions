import { Action, Tool } from "@raycast/api";
import { addMovieIdToHistory } from "../lib/media-mutations";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The Trakt ID of the movie to mark as watched.
   * Obtain this first by calling `search-movies`.
   */
  traktId: number;
  /**
   * The title of the movie.
   * Required for the confirmation dialog presented to the user.
   */
  title: string;
  /**
   * The release year of the movie (optional).
   */
  year?: number;
  /**
   * Optional watched date in ISO format (e.g. "2026-09-15T12:00:00Z").
   * Defaults to current timestamp if omitted.
   */
  watchedAt?: string;
};

type Output = {
  success: boolean;
  message: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const info = [
    { name: "Title", value: input.title },
    { name: "Trakt ID", value: String(input.traktId) },
  ];

  if (input.year) {
    info.splice(1, 0, { name: "Year", value: String(input.year) });
  }

  return {
    style: Action.Style.Regular,
    message: `Mark movie "${input.title}" as watched on Trakt?`,
    info,
  };
};

/**
 * Mark a movie as watched in your Trakt history.
 * Requires a valid `traktId` obtained from `search-movies`.
 * A confirmation dialog is shown to the user before recording the watch.
 */
export default async function tool(input: Input): Promise<Output> {
  const { traktId, title, watchedAt } = input;

  await executeToolCall(
    (signal) => addMovieIdToHistory(toolTraktClient, traktId, { signal, watchedAt }),
    `Failed to mark movie "${title}" (ID: ${traktId}) as watched`,
  );

  return {
    success: true,
    message: `"${title}" has been successfully marked as watched in your Trakt history.`,
  };
}
