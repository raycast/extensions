import { Action, Tool } from "@raycast/api";
import { addMovieIdToHistory } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { assertSyncAdded, readSyncWrite } from "./sync-write";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The Trakt ID of the movie to mark as watched.
   * Obtain this first by calling `search-movies`.
   */
  traktId: number;
  /**
   * Optional title of the movie. Ignored: confirmation and success always use the title
   * Trakt holds for `traktId`.
   */
  title?: string;
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
  const verified = await describeMedia("movie", input.traktId);

  return {
    style: Action.Style.Regular,
    message: `Mark the movie ${verified} as watched on Trakt?`,
    info: [
      { name: "Title", value: verified },
      { name: "Trakt ID", value: String(input.traktId) },
    ],
  };
};

/**
 * Mark a movie as watched in your Trakt history.
 * Requires a valid `traktId` obtained from `search-movies`.
 * A confirmation dialog is shown to the user before recording the watch.
 */
export default async function tool(input: Input): Promise<Output> {
  const { traktId, watchedAt } = input;
  const verified = await describeMedia("movie", traktId);

  const response = await executeToolCall(
    (signal) => addMovieIdToHistory(toolTraktClient, traktId, { signal, watchedAt }),
    `Failed to mark ${verified} (ID: ${traktId}) as watched`,
  );
  assertSyncAdded(readSyncWrite(response.body, "movies"), verified);

  return {
    success: true,
    message: `${verified} has been successfully marked as watched in your Trakt history.`,
  };
}
