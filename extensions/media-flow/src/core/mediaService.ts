import { mediaControlProvider } from "../providers/mediaControl";
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
      getProviders().map((p) =>
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

  return { sources, engineAvailable };
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
