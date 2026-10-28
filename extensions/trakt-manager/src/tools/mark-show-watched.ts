import { Action, Tool } from "@raycast/api";
import { addShowIdToHistory } from "../lib/media-mutations";
import { describeMedia } from "./resolve-media";
import { assertSyncAdded, readSyncWrite } from "./sync-write";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The Trakt ID of the TV show to mark entirely as watched.
   * Obtain this first from `search-shows`.
   */
  traktId: number;
  /**
   * Optional title of the TV show. Ignored: confirmation always uses the title Trakt
   * holds for `traktId`.
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
  const verified = await describeMedia("show", input.traktId);

  return {
    style: Action.Style.Destructive,
    message: `WARNING: Mark ALL seasons and episodes of ${verified} as watched on Trakt?`,
    info: [
      { name: "Show", value: verified },
      { name: "Scope", value: "Entire show (all seasons & episodes)" },
      { name: "Trakt ID", value: String(input.traktId) },
    ],
  };
};

/**
 * Mark an ENTIRE TV series (all seasons and episodes) as watched in your Trakt history.
 * DO NOT use this to mark a single episode; use `mark-episode-watched` instead.
 * A destructive confirmation dialog is shown to the user before proceeding.
 */
export default async function tool(input: Input): Promise<Output> {
  const { traktId, watchedAt } = input;
  const verified = await describeMedia("show", traktId);

  const response = await executeToolCall(
    (signal) => addShowIdToHistory(toolTraktClient, traktId, { signal, watchedAt }),
    `Failed to mark ${verified} (ID: ${traktId}) as watched`,
  );
  assertSyncAdded(readSyncWrite(response.body, ["shows", "episodes"]), verified);

  return {
    success: true,
    message: `All seasons and episodes of ${verified} have been successfully marked as watched in your Trakt history.`,
  };
}
