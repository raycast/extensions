import { Action, Tool } from "@raycast/api";
import { checkInEpisode, checkInMovie, fetchActiveCheckin } from "../lib/media-mutations";
import { episodeCode, resolveEpisode } from "./mark-episode-watched";
import { describeMedia } from "./resolve-media";
import { getToolSignal, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Trakt ID of the movie being watched, from `search-movies`. Leave empty for an episode.
   */
  movieTraktId?: number;
  /**
   * Trakt ID of the show, from `search-shows` or `get-up-next`, for an episode. Pass it with
   * `seasonNumber` and `episodeNumber`; the episode is resolved from the three.
   */
  showTraktId?: number;
  /** Season number of the episode (e.g. 2). */
  seasonNumber?: number;
  /** Episode number within the season (e.g. 3). */
  episodeNumber?: number;
};

type Output = {
  success: boolean;
  message: string;
  /** When Trakt turns the check-in into a play, unless it is stopped before. */
  expiresAt?: string;
};

type Target = { kind: "movie"; traktId: number; label: string } | { kind: "episode"; traktId: number; label: string };

function readInput(input: Input) {
  const hasMovie = input.movieTraktId !== undefined;
  const hasEpisode =
    input.showTraktId !== undefined || input.seasonNumber !== undefined || input.episodeNumber !== undefined;
  if (hasMovie === hasEpisode) {
    throw new Error("Pass either `movieTraktId`, or `showTraktId` with `seasonNumber` and `episodeNumber`.");
  }
  if (!hasMovie && (input.seasonNumber === undefined || input.episodeNumber === undefined)) {
    throw new Error("An episode check-in needs `showTraktId`, `seasonNumber` and `episodeNumber`.");
  }
}

/** Resolves what is being checked into, named as Trakt holds it, so the confirmation and the write agree. */
async function resolveTarget(input: Input): Promise<Target> {
  readInput(input);
  if (input.movieTraktId !== undefined) {
    return { kind: "movie", traktId: input.movieTraktId, label: await describeMedia("movie", input.movieTraktId) };
  }

  const [showTraktId, season, number] = [input.showTraktId!, input.seasonNumber!, input.episodeNumber!];
  const [showLabel, episode] = await Promise.all([
    describeMedia("show", showTraktId),
    resolveEpisode(showTraktId, season, number),
  ]);
  const code = episodeCode(season, number);
  return {
    kind: "episode",
    traktId: episode.ids.trakt,
    label: `${showLabel} ${episode.title ? `${code} "${episode.title}"` : code}`,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const target = await resolveTarget(input);
  return {
    style: Action.Style.Regular,
    message: `Check in to ${target.label} on Trakt?`,
    info: [
      { name: "Title", value: target.label },
      {
        name: "What happens",
        value: "Shown as watching now; it becomes a play when the runtime ends. Nothing is posted to social networks.",
      },
    ],
  };
};

/**
 * "Now Watching": check in to a movie or an episode on Trakt. It shows as watching now and becomes a play
 * when its runtime ends, unless `stop-check-in` cancels it first. Only one check-in can be active.
 * A confirmation dialog is shown to the user before checking in.
 */
export default async function tool(input: Input): Promise<Output> {
  const target = await resolveTarget(input);

  if (target.kind === "movie") await checkInMovie(toolTraktClient, target.traktId, { signal: getToolSignal() });
  else await checkInEpisode(toolTraktClient, target.traktId, { signal: getToolSignal() });

  // A 2xx is not proof: read the check-in back and make sure it is this title.
  const active = await fetchActiveCheckin(toolTraktClient, { signal: getToolSignal() });
  if (!active || active.type !== target.kind || active.traktId !== target.traktId) {
    throw new Error(`Trakt did not report a check-in to ${target.label}. Nothing is shown as watching.`);
  }

  return {
    success: true,
    message: `Checked in to ${target.label}. It becomes a play at ${active.expiresAt} unless the check-in is stopped.`,
    expiresAt: active.expiresAt,
  };
}
