// Loads the signed-in user's library through the music tab. The page script does
// the authenticated fetch and trims it; this module only drives the poll.

import {
  LIBRARY_DIAGNOSTICS_SCRIPT,
  LIBRARY_RESET_SCRIPT,
  LIBRARY_START_SCRIPT,
  LIBRARY_STATE_SCRIPT,
  collectionStartScript,
  collectionStateScript,
  parseCollectionPayload,
  parseLibraryPayload,
  type LibraryData,
} from "./library-page";
import type { SongResult } from "./search";
import { runJSInYouTubeMusicTab } from "./utils";

export type { LibraryData };

const POLL_INTERVAL_MS = 300;
const LOAD_TIMEOUT_MS = 10_000;

export type LibraryResult = { status: "ready"; data: LibraryData } | { status: "unavailable"; reason: string };

/** One album or playlist, opened for browsing rather than played from the start. */
export interface CollectionRequest {
  /** VL… for a playlist, MPREb… for an album. */
  browseId: string;
  title: string;
  kind: "album" | "playlist";
  /** Cover for rows that carry no thumbnail of their own. */
  artworkURL?: string;
}

export type CollectionResult =
  | { status: "ready"; tracks: SongResult[]; truncated: boolean }
  | { status: "unavailable"; reason: string };

function runLibraryJS(code: string): Promise<string | undefined> {
  return runJSInYouTubeMusicTab(code, { silent: true, musicOnly: true });
}

/**
 * Loads the tracks of one album or playlist so it can be browsed. Kept separate
 * from `loadLibrary` because it is only fetched when the user opens a collection.
 */
export async function loadCollection(request: CollectionRequest): Promise<CollectionResult> {
  const albumTitle = request.kind === "album" ? request.title : "";
  const started = await runLibraryJS(collectionStartScript(request.browseId, albumTitle, request.artworkURL ?? ""));
  if (started === undefined) return { status: "unavailable", reason: "no-tab" };

  const deadline = Date.now() + LOAD_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = await runLibraryJS(collectionStateScript(request.browseId));
    if (state === undefined) return { status: "unavailable", reason: "no-tab" };

    if (state.startsWith("error:")) return { status: "unavailable", reason: state.slice("error:".length) };

    if (state !== "pending" && state !== "idle") {
      const parsed = parseCollectionPayload(state);
      if (!parsed) return { status: "unavailable", reason: "unreadable" };
      return { status: "ready", tracks: parsed.tracks, truncated: parsed.truncated };
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return { status: "unavailable", reason: "timeout" };
}

/**
 * What the last library run saw, as JSON meant to be pasted into a bug report:
 * per-scope status, the response's logged_in flag, row counts and sample titles.
 */
export async function readLibraryDiagnostics(): Promise<string | undefined> {
  return runLibraryJS(LIBRARY_DIAGNOSTICS_SCRIPT);
}

/**
 * Loads the library, reusing the page-side snapshot while it is fresh.
 *
 * Resolves "unavailable" rather than throwing: a missing tab, a signed-out page,
 * or a rejected request should cost the caller a section, not the whole command.
 * Pass `force` to refetch instead of reusing the snapshot.
 */
export async function loadLibrary(options?: { force?: boolean }): Promise<LibraryResult> {
  if (options?.force) await runLibraryJS(LIBRARY_RESET_SCRIPT);

  const started = await runLibraryJS(LIBRARY_START_SCRIPT);
  if (started === undefined) return { status: "unavailable", reason: "no-tab" };

  const deadline = Date.now() + LOAD_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = await runLibraryJS(LIBRARY_STATE_SCRIPT);
    if (state === undefined) return { status: "unavailable", reason: "no-tab" };

    // A signed-out tab answers every library request with a sign-in prompt rather
    // than an error, so it has to be reported separately from "empty library".
    if (state === "signed-out") return { status: "unavailable", reason: "signed-out" };

    if (state.startsWith("error:")) {
      return { status: "unavailable", reason: state.slice("error:".length) };
    }

    if (state !== "pending" && state !== "idle") {
      const data = parseLibraryPayload(state);
      if (!data) return { status: "unavailable", reason: "unreadable" };
      return { status: "ready", data };
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return { status: "unavailable", reason: "timeout" };
}
