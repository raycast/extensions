import { getPreferenceValues } from "@raycast/api";

/// Echo's loopback bridge. Fixed port, 127.0.0.1 only, so this never touches the network.
const BASE = "http://127.0.0.1:17893";

export interface EchoItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  appName: string;
  bundleID: string;
  source: "native" | "browser";
  type: "music" | "podcast" | "video" | "unknown";
  typeName: string;
  /// Composed by Echo, not here: the artist or app, plus a play count once it becomes a habit.
  subtitle: string;
  /// Echo's branding for the source, e.g. "YouTube" or "Spotify" rather than the browser's name.
  service: string;
  /// That source's brand color as hex, straight from Echo's own palette.
  serviceColor: string;
  lastPlayed: string;
  playCount: number;
  pinned: boolean;
  saved: boolean;
  duration?: number;
  position?: number;
  resumeURL?: string;
  artworkURL?: string;
  artworkPath?: string;
  /// The resume link with any timestamp stripped, cleaned by Echo itself so this extension never
  /// has to guess which query parameters mean "start here".
  cleanURL?: string;
  /// Whether the two differ. Echo only offers "Copy Link With Timestamp" when they do.
  hasTimestamp?: boolean;
  /// True for a YouTube video, the only kind Echo's own player can show or play headless (Echo
  /// 1.0.25+; earlier versions said true for any web video). Everything else just resumes.
  canPiP: boolean;
  /// Whether Echo would bring this back as a watch rather than a listen, based on how you last
  /// consumed it. Used only to label the default action honestly.
  prefersWatch: boolean;
}

/// Matches Echo's own action list. "auto" is what pressing Return does inside Echo.
export type ResumeMode = "auto" | "pip" | "background" | "open" | "start";

export interface NowPlaying {
  id: string;
  title: string;
  artist?: string;
  appName: string;
  type: string;
  playing: boolean;
  position?: number;
  duration?: number;
}

/// An error we can show the user as a sentence they can act on, rather than a stack trace.
export class EchoError extends Error {
  readonly hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.hint = hint;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = getPreferenceValues<{ token: string }>();

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "X-Echo-Token": token, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new EchoError("Echo is not running", "Open Echo and try again.");
  }

  if (res.status === 401) {
    throw new EchoError("That token was not accepted", "Copy it again from Echo, under Settings > Raycast.");
  }
  if (res.status === 403) {
    throw new EchoError(
      "Raycast access is switched off",
      "Turn on Allow Raycast Access in Echo, under Settings > Raycast.",
    );
  }
  if (!res.ok) {
    throw new EchoError("Echo could not do that", `The app replied with ${res.status}.`);
  }
  return (await res.json()) as T;
}

export async function fetchHistory(query: string, type: string, limit = 200): Promise<EchoItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());
  if (type && type !== "all") params.set("type", type);
  const data = await call<{ items: EchoItem[] }>(`/api/history?${params.toString()}`);
  return data.items ?? [];
}

/// The thing you played most recently. Echo's list puts pinned items first, so its top row is not
/// this when anything is pinned (Resume Last Played used to resume a pinned item instead).
export async function fetchLastPlayed(): Promise<EchoItem | undefined> {
  const items = await fetchHistory("", "all");
  return items.reduce<EchoItem | undefined>(
    (best, it) => (!best || new Date(it.lastPlayed) > new Date(best.lastPlayed) ? it : best),
    undefined,
  );
}

export async function fetchStatus(): Promise<{ nowPlaying?: NowPlaying; paused: boolean; line: string }> {
  return call("/api/status");
}

const post = <T>(path: string, body: Record<string, unknown> = {}) =>
  call<T>(path, { method: "POST", body: JSON.stringify(body) });

export const resumeItem = (id: string, mode: ResumeMode = "auto") => post("/api/resume", { id, mode });
export const playPause = () => post("/api/playpause");
export const showEcho = () => post("/api/show");
export const setSaved = (id: string, value: boolean) => post("/api/save", { id, value });
export const setPinned = (id: string, value: boolean) => post("/api/pin", { id, value });
/// An empty title resets to the captured name, matching Echo's own Rename.
export const renameItem = (id: string, title: string) => post("/api/rename", { id, title });
export const removeItem = (id: string) => post("/api/remove", { id });
export const removeSource = (id: string) => post("/api/removesource", { id });
export const neverRecord = (id: string) => post("/api/neverrecord", { id });

// MARK: - Presentation helpers

/// Percent complete, exactly as Echo's own CompletionPill computes and shows it. Echo displays this
/// for time-based media only (podcasts, videos) and never for music, where a song's progress is not
/// something people track (resuming carries on where the player stopped, not from a saved percent). Returns undefined when nothing should show, so the
/// caller can just skip the accessory. `type` is already Echo's effective type.
export function completionLabel(item: EchoItem): string | undefined {
  if (item.type === "music") return undefined;
  const p = item.position;
  const d = item.duration;
  if (!p || !d || d <= 0 || p <= 1) return undefined;
  const pct = Math.round(Math.min(Math.max(p / d, 0), 1) * 100);
  return `${pct}%`;
}
