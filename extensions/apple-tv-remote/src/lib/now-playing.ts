/**
 * What the Apple TV is playing, read from the `NowPlayingInfo` events tvOS 18+
 * pushes over Companion (pyatv #2325). This is how the extension knows a show
 * actually started, in which app, and from where, without seeing the screen.
 */
import { AppleTVConnection } from "@bharper/atv-js";
// The library's NSKeyedArchiver reader; it isn't re-exported from the package root.
import { readArchiveProperties } from "@bharper/atv-js/dist/bplist";

export interface NowPlaying {
  /** Missing when the app publishes an empty record, as Netflix does. */
  bundleId?: string;
  title?: string;
  playing: boolean;
  /** Seconds into the item. */
  position?: number;
}

type Listener = (state: NowPlaying) => void;
const listeners = new WeakMap<AppleTVConnection, Set<Listener>>();

/** Seconds since 2001-01-01, the epoch tvOS stamps positions with. */
const appleNow = () => Date.now() / 1000 - 978307200;

async function decode(conn: AppleTVConnection, archive: unknown): Promise<NowPlaying | null> {
  if (!Buffer.isBuffer(archive)) return null;
  const [bundleId, title, rate, offset, stampedAt] = readArchiveProperties(
    archive,
    ["root", "metadata", "bundleID"],
    ["root", "metadata", "title"],
    ["root", "playbackRate"],
    ["root", "metadata", "timeOffset"],
    ["root", "metadata", "timestamp"],
  ).map((value) => (value === "$null" ? null : value));
  if (rate === null) {
    // An empty record (Netflix) says nothing; the media-control flags at least show whether a player is active.
    const status = await conn.protocol.sendCommand("FetchMediaControlStatus", {}).catch(() => null);
    return { playing: Number((status?._c as Record<string, unknown>)?.MediaControlFlags) > 0 };
  }
  const speed = Number(rate) || 0;
  // The offset was measured at `stampedAt`; carry it forward to now.
  const position =
    typeof offset === "number"
      ? offset + (typeof stampedAt === "number" ? (appleNow() - stampedAt) * speed : 0)
      : undefined;
  return {
    bundleId: typeof bundleId === "string" ? bundleId : undefined,
    title: typeof title === "string" ? title : undefined,
    playing: speed > 0,
    position,
  };
}

/** Every now-playing report on this connection until the returned function is called. */
export function onNowPlaying(conn: AppleTVConnection, listener: Listener): () => void {
  let set = listeners.get(conn);
  if (!set) {
    const fresh = new Set<Listener>();
    listeners.set(conn, fresh);
    conn.protocol.listenTo("NowPlayingInfo", async (content) => {
      const state = await decode(conn, content.NowPlayingInfoKey);
      if (state) fresh.forEach((fn) => fn(state));
    });
    conn.protocol.sendEvent("_interest", { _regEvents: ["NowPlayingInfo"] });
    set = fresh;
  }
  set.add(listener);
  return () => set.delete(listener);
}

/**
 * The first report that satisfies `accept`, or null after `timeoutMs`. With
 * `ask`, requests the current state up front; without, waits for the TV to
 * push a change.
 */
export function nowPlaying(
  conn: AppleTVConnection,
  accept: (state: NowPlaying) => boolean = () => true,
  timeoutMs = 2000,
  ask = true,
): Promise<NowPlaying | null> {
  return new Promise((resolve) => {
    const finish = (state: NowPlaying | null) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(state);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    const unsubscribe = onNowPlaying(conn, (state) => accept(state) && finish(state));
    if (ask) conn.protocol.sendCommand("FetchCurrentNowPlayingInfoEvent", {}).catch(() => {});
  });
}

/**
 * "The Boys in Prime Video, 24:37 in" or "…, paused at 24:37". Some apps
 * report the episode title, so a known show name leads when given.
 */
export function describe(state: NowPlaying, appNames: Record<string, string>, show?: string): string {
  // Without a bundle ID the app is unknown; a reported title (Spotify sends one) beats the request.
  if (!state.bundleId) {
    const named = state.title || show ? `“${state.title ?? show}”` : "something the app doesn't name";
    return state.playing ? named : `${named}, paused`;
  }
  const title = show ?? state.title;
  const episode = show && state.title && !state.title.toLowerCase().includes(show.toLowerCase()) ? state.title : "";
  const name = `${title ?? "Something"} in ${appNames[state.bundleId] ?? state.bundleId}`;
  const where = episode ? `${name} (${episode})` : name;
  const seconds = Math.floor(state.position ?? 0);
  const at = seconds >= 60 && `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  if (!at) return state.playing ? where : `${where}, paused`;
  return state.playing ? `${where}, ${at} in` : `${where}, paused at ${at}`;
}
