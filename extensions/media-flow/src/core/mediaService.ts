import { resolveAppName } from "../lib/appName";
import { execSafe } from "../lib/exec";
import { mediaControlProvider, probeTitle } from "../providers/mediaControl";
import { findProviderForBundle, getProviders } from "./registry";
import type { MediaSource, PlaybackCommand } from "./types";

export interface MediaSnapshot {
  sources: MediaSource[];
  engineAvailable: boolean;
}

/** Strips keys whose value is explicitly undefined so they cannot clobber merge targets. */
function defined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

const keyOf = (s: MediaSource) => s.bundleId ?? s.id;

export async function getMediaSources(
  pinnedId?: string,
): Promise<MediaSnapshot> {
  const engineAvailablePromise = mediaControlProvider
    .isAvailable()
    .catch(() => false);
  const primaryPromise = engineAvailablePromise.then((ok) =>
    ok ? mediaControlProvider.getSource().catch(() => null) : null,
  );

  const [engineAvailable, primary] = await Promise.all([
    engineAvailablePromise,
    primaryPromise,
  ]);

  const providerSources = (
    await Promise.all(
      getProviders()
        // Skip heuristic fallback providers (e.g. browser tab scraping) when the engine
        // is available — media-control already reports browser media accurately, and the
        // fallback can otherwise add a wrong/stale duplicate source.
        .filter((p) => !(p.fallbackOnly && engineAvailable))
        .map((p) =>
          p
            .isAvailable()
            .then((ok) => (ok ? p.getSource() : null))
            .catch(() => null),
        ),
    )
  ).filter((s): s is MediaSource => s !== null);

  const merged = new Map<string, MediaSource>();
  if (primary) merged.set(keyOf(primary), primary);
  for (const s of providerSources) {
    const key = keyOf(s);
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, {
        ...existing,
        ...defined(s),
        artworkPath: existing.artworkPath ?? s.artworkPath,
        isPlaying: existing.isPlaying || s.isPlaying,
      });
    } else {
      merged.set(key, s);
    }
  }

  const sources = [...merged.values()].sort((a, b) => {
    if (a.isPlaying !== b.isPlaying) return a.isPlaying ? -1 : 1;
    const aPin = a.id === pinnedId ? 0 : 1;
    const bPin = b.id === pinnedId ? 0 : 1;
    if (aPin !== bPin) return aPin - bPin;
    return a.appName.localeCompare(b.appName);
  });

  const named = await Promise.all(
    sources.map(async (s) => ({
      ...s,
      appName: await resolveAppName(s.bundleId, s.appName),
    })),
  );

  return { sources: named, engineAvailable };
}

/**
 * Reorders `sources` to match the relative order of ids in `prev`, appending any ids not
 * seen in `prev` at the end (in their given order). Used to keep menu rows from shifting
 * position on every live re-poll while a native menu is open — only the id *set* changing
 * (a source appearing/disappearing) should reshuffle rows; state flips like isPlaying should not.
 */
export function stabilizeOrder(
  prev: string[],
  sources: MediaSource[],
): MediaSource[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const ordered: MediaSource[] = [];
  for (const id of prev) {
    const s = byId.get(id);
    if (s) {
      ordered.push(s);
      byId.delete(id);
    }
  }
  for (const s of sources) {
    if (byId.has(s.id)) ordered.push(s);
  }
  return ordered;
}

/** Bring the source's app window to the front (activates the app). */
export async function focusSource(source: MediaSource): Promise<void> {
  const args = source.bundleId
    ? ["-b", source.bundleId]
    : ["-a", source.appName];
  await execSafe("open", args);
}

const PREV_CHECK_MS = 100;
const PREV_CHECK_TRIES = 5; // ~0.5s window to decide restart vs. real skip

/**
 * "Previous track" that always lands on the previous song. Most players treat the first
 * previous press as "restart the current track" once playback is a few seconds in, so we
 * send previous, watch whether the title actually changes, and press again when it didn't
 * (i.e. the track just restarted). App-agnostic — no fixed position threshold — and avoids
 * the double-skip you'd get from blindly pressing twice.
 */
export async function goToPreviousTrack(source: MediaSource): Promise<void> {
  const before = source.title;
  await controlSource(source, "previous");

  let movedToAnotherTrack = false;
  for (let i = 0; i < PREV_CHECK_TRIES; i++) {
    await new Promise((r) => setTimeout(r, PREV_CHECK_MS));
    const title = await probeTitle();
    if (title !== null && title !== before) {
      movedToAnotherTrack = true;
      break;
    }
  }

  if (!movedToAnotherTrack) await controlSource(source, "previous");
}

export async function controlSource(
  source: MediaSource,
  cmd: PlaybackCommand,
): Promise<void> {
  const owner = source.bundleId
    ? findProviderForBundle(source.bundleId)
    : undefined;
  if (owner?.capabilities.control && owner.control) {
    await owner.control(cmd);
    return;
  }
  await mediaControlProvider.control?.(cmd);
}
