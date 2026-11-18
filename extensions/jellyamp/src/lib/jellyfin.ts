import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { getPreferenceValues, LocalStorage, open, showToast, Toast } from "@raycast/api";
import type {
  JellyfinAuthResponse,
  JellyfinItem,
  JellyfinItemsResponse,
  JellyfinItemType,
  ResolvedCredentials,
} from "../types";

const execFileAsync = promisify(execFile);

// LocalStorage keys for cached auth token (username/password flow)
const CACHED_TOKEN_KEY = "jellyfin_auth_token";
const CACHED_USER_ID_KEY = "jellyfin_user_id";

// LocalStorage keys for credentials saved via the in-extension setup form
const SETUP_SERVER_URL = "jellyfin_setup_server_url";
const SETUP_API_KEY = "jellyfin_setup_api_key";
const SETUP_USER_ID = "jellyfin_setup_user_id";
const SETUP_USERNAME = "jellyfin_setup_username";
const SETUP_PASSWORD = "jellyfin_setup_password";

// ─── Authorization header ─────────────────────────────────────────────────────

/** Builds the MediaBrowser authorization header Jellyfin requires. */
function buildAuthHeader(token?: string): string {
  const parts = [
    `MediaBrowser Client="Raycast Extension"`,
    `Device="Raycast"`,
    `DeviceId="raycast-jellyamp-01"`,
    `Version="1.0.0"`,
  ];
  if (token) {
    parts.push(`Token="${token}"`);
  }
  return parts.join(", ");
}

// ─── Credential resolution ────────────────────────────────────────────────────

/**
 * Resolves credentials in priority order:
 * 1. API Key (from setup form or preferences) — direct, no request needed
 * 2. Cached token (from a previous username/password login)
 * 3. Username/password login → fetches + caches a new token
 *
 * Server URL is read from LocalStorage (set by SetupForm) first,
 * falling back to the Raycast preference value.
 */
export async function resolveCredentials(): Promise<ResolvedCredentials> {
  const prefs = getPreferenceValues<Preferences>();

  // Prefer server URL saved via in-extension form; fall back to preference
  const savedServerUrl = await LocalStorage.getItem<string>(SETUP_SERVER_URL);
  const rawServerUrl = savedServerUrl || prefs.serverUrl || "";
  if (!rawServerUrl) {
    throw new Error("No server URL configured. Please run setup again.");
  }
  const serverUrl = rawServerUrl.replace(/\/+$/, ""); // strip trailing slash

  // In-extension setup form values take priority over Raycast preferences.
  // Raycast's LocalStorage is already encrypted at rest by the platform.
  const savedApiKey = await LocalStorage.getItem<string>(SETUP_API_KEY);
  const savedUserId = await LocalStorage.getItem<string>(SETUP_USER_ID);
  const savedUsername = await LocalStorage.getItem<string>(SETUP_USERNAME);
  const savedPassword = await LocalStorage.getItem<string>(SETUP_PASSWORD);

  const apiKey = savedApiKey || prefs.apiKey;
  const userId = (savedUserId || prefs.userId)?.trim();
  const username = savedUsername || prefs.username;
  const password = savedPassword || prefs.password;

  // 1️⃣ API Key path
  if (apiKey) {
    if (!userId) throw new Error("API Key is set but no User ID was provided.");
    return { serverUrl, token: apiKey, userId };
  }

  // 2️⃣ Username/password path
  if (!username || !password) {
    throw new Error("No credentials configured.");
  }

  // Try cached token first
  const cachedToken = await LocalStorage.getItem<string>(CACHED_TOKEN_KEY);
  const cachedUserId = await LocalStorage.getItem<string>(CACHED_USER_ID_KEY);

  if (cachedToken && cachedUserId) {
    return { serverUrl, token: cachedToken, userId: cachedUserId };
  }

  // Authenticate and cache
  const authData = await authenticateByName(serverUrl, username, password);
  await LocalStorage.setItem(CACHED_TOKEN_KEY, authData.AccessToken);
  await LocalStorage.setItem(CACHED_USER_ID_KEY, authData.User.Id);

  return { serverUrl, token: authData.AccessToken, userId: authData.User.Id };
}

/** Clears all cached/saved credentials (token cache + setup values). */
export async function clearCachedToken(): Promise<void> {
  await LocalStorage.removeItem(CACHED_TOKEN_KEY);
  await LocalStorage.removeItem(CACHED_USER_ID_KEY);
  await LocalStorage.removeItem(SETUP_SERVER_URL);
  await LocalStorage.removeItem(SETUP_API_KEY);
  await LocalStorage.removeItem(SETUP_USER_ID);
  await LocalStorage.removeItem(SETUP_USERNAME);
  await LocalStorage.removeItem(SETUP_PASSWORD);
}

/** Saves credentials entered via the in-extension setup form.
 *  Raycast's LocalStorage is encrypted at rest by the platform. */
export async function saveSetupCredentials(values: {
  serverUrl: string;
  apiKey: string;
  userId: string;
  username: string;
  password: string;
}): Promise<void> {
  if (values.serverUrl.trim()) await LocalStorage.setItem(SETUP_SERVER_URL, values.serverUrl.trim());
  if (values.apiKey.trim()) await LocalStorage.setItem(SETUP_API_KEY, values.apiKey.trim());
  if (values.userId.trim()) await LocalStorage.setItem(SETUP_USER_ID, values.userId.trim());
  if (values.username.trim()) await LocalStorage.setItem(SETUP_USERNAME, values.username.trim());
  if (values.password.trim()) await LocalStorage.setItem(SETUP_PASSWORD, values.password.trim());
}

/**
 * Returns true if at least one complete auth method is available from any source,
 * AND a server URL is known. Both are required for the extension to function.
 */
export async function credentialsConfigured(): Promise<boolean> {
  const prefs = getPreferenceValues<Preferences>();

  // Check that we have a server URL from somewhere
  const savedServerUrl = await LocalStorage.getItem<string>(SETUP_SERVER_URL);
  const hasServerUrl = !!(savedServerUrl || prefs.serverUrl);
  if (!hasServerUrl) return false;

  // Check that we have at least one auth credential from somewhere
  if (prefs.apiKey || prefs.username) return true;
  const savedApiKey = await LocalStorage.getItem<string>(SETUP_API_KEY);
  const savedUsername = await LocalStorage.getItem<string>(SETUP_USERNAME);
  return !!(savedApiKey || savedUsername);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function authenticateByName(
  serverUrl: string,
  username: string,
  password: string,
): Promise<JellyfinAuthResponse> {
  const url = `${serverUrl}/Users/AuthenticateByName`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(),
    },
    body: JSON.stringify({ Username: username, Pw: password }),
  });

  if (!res.ok) {
    throw new Error(`Authentication failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<JellyfinAuthResponse>;
}

// ─── Search / Item fetching ───────────────────────────────────────────────────

export interface SearchOptions {
  query?: string;
  /** Filter to a specific item type; defaults to Audio only */
  types?: JellyfinItemType[];
  limit?: number;
  startIndex?: number;
  /** Only return items that are direct children of this album */
  parentId?: string;
}

/**
 * Searches the Jellyfin music library.
 * Handles auth automatically via resolveCredentials().
 */
export async function searchItems(options: SearchOptions = {}): Promise<JellyfinItemsResponse> {
  const { serverUrl, token, userId } = await resolveCredentials();

  const { query = "", types = ["Audio"], limit = 50, startIndex = 0, parentId } = options;

  const params = new URLSearchParams({
    UserId: userId,
    Recursive: "true",
    IncludeItemTypes: types.join(","),
    Fields:
      "BasicSyncInfo,MediaSources,ArtistItems,AlbumArtist,ParentIndexNumber,IndexNumber,Tags,Genres,Bitrate,Container",
    SearchTerm: query,
    Limit: String(limit),
    StartIndex: String(startIndex),
    SortBy: query ? "SortName" : "DatePlayed,SortName",
    SortOrder: "Ascending",
    ImageTypeLimit: "1",
    EnableImageTypes: "Primary,Art,Thumb",
    api_key: token,
  });

  if (parentId) {
    params.set("ParentId", parentId);
    params.delete("Recursive");
  }

  const url = `${serverUrl}/Users/${userId}/Items?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: buildAuthHeader(token) },
  });

  if (res.status === 401) {
    // Token might be stale (username/password flow); clear cache and surface error
    await clearCachedToken();
    throw new Error("Authentication expired. Please try again — your session has been cleared.");
  }

  if (!res.ok) {
    throw new Error(`Jellyfin request failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<JellyfinItemsResponse>;
}

/**
 * Fetches music artists using the dedicated /Artists endpoint.
 * The generic /Users/{id}/Items endpoint with IncludeItemTypes=MusicArtist
 * does NOT reliably return artists — this endpoint is the correct one.
 */
export async function getArtists(query?: string): Promise<JellyfinItem[]> {
  const { serverUrl, token, userId } = await resolveCredentials();

  const params = new URLSearchParams({
    UserId: userId,
    Recursive: "true",
    Fields: "BasicSyncInfo,ArtistItems,Tags,Genres",
    SortBy: "SortName",
    SortOrder: "Ascending",
    ImageTypeLimit: "1",
    EnableImageTypes: "Primary,Art,Thumb",
    Limit: "100",
    api_key: token,
  });

  if (query) {
    params.set("SearchTerm", query);
  }

  const url = `${serverUrl}/Artists?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: buildAuthHeader(token) },
  });

  if (!res.ok) throw new Error(`Artists request failed: ${res.status} ${res.statusText}`);

  const data = (await res.json()) as JellyfinItemsResponse;
  // The /Artists endpoint returns items without a Type field — stamp it so our UI knows
  return data.Items.map((item) => ({ ...item, Type: "MusicArtist" as const }));
}

// ─── URL builders ─────────────────────────────────────────────────────────────

/**
 * Builds a direct audio stream URL for the given item ID.
 * Uses the /Items/{id}/Download endpoint as the /Audio/{id}/universal
 * endpoint is no longer reliable in newer Jellyfin versions.
 */
export async function getStreamUrl(itemId: string): Promise<string> {
  const { serverUrl, token } = await resolveCredentials();
  const prefs = getPreferenceValues<Preferences>();

  const params = new URLSearchParams({
    api_key: token,
  });

  if (prefs.audioCodec && prefs.audioCodec !== "copy") {
    params.set("audioCodec", prefs.audioCodec);
  }

  return `${serverUrl}/Items/${itemId}/Download?${params.toString()}`;
}

/**
 * Opens a stream URL in the configured media player.
 *
 * - If `mediaPlayerPath` preference is set (e.g. PotPlayer64.exe), spawns it
 *   directly with the URL as the only argument — bypasses the browser entirely.
 * - Falls back to Raycast's built-in open() if no path is configured, which
 *   uses the OS protocol handler (may open browser for http/https on Windows).
 */
export async function playWithMediaPlayer(streamUrl: string): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  // Strip surrounding quotes that users often accidentally paste (e.g. "C:\Program Files\...")
  const playerPath = prefs.mediaPlayerPath?.trim().replace(/^["']|["']$/g, "");

  if (playerPath) {
    // Spawn the player directly — this is how you avoid browser interception on Windows
    await execFileAsync(playerPath, [streamUrl]);
  } else {
    // Fallback: write a temporary .m3u playlist and open it.
    // The OS natively routes .m3u files to the default audio player (WMP, PotPlayer, VLC, etc.)
    // instead of routing raw HTTP URLs to the web browser.
    const tempDir = os.tmpdir();
    const m3uPath = path.join(tempDir, `jellyfin-raycast-${Date.now()}.m3u`);
    await fs.writeFile(m3uPath, streamUrl, "utf-8");
    await open(m3uPath);
    // Clean up after the media player has had time to read the file
    setTimeout(() => fs.unlink(m3uPath).catch(() => {}), 30_000);
  }
}

/**
 * Builds the cover art image URL for a Jellyfin item.
 * Falls back to the album's image if the item has no Primary image.
 */
export function getImageUrl(item: JellyfinItem, serverUrl: string, token: string, size = 200): string {
  // For a track: prefer the album's Primary image tag
  const imageItemId = item.AlbumId && item.AlbumPrimaryImageTag ? item.AlbumId : item.Id;
  const imageTag = item.AlbumPrimaryImageTag ?? item.ImageTags?.Primary ?? item.ImageTags?.Thumb ?? item.ImageTags?.Art;

  if (!imageTag) {
    // Return a placeholder if there's no image available
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      item.Name,
    )}&size=${size}&background=1a1a2e&color=fff&bold=true`;
  }

  const params = new URLSearchParams({
    tag: imageTag,
    maxWidth: String(size),
    maxHeight: String(size),
    quality: "90",
    api_key: token,
  });
  return `${serverUrl}/Items/${imageItemId}/Images/Primary?${params.toString()}`;
}

/**
 * Builds the Jellyfin Web UI URL for an item.
 * Opens in the default browser so the user can manage/play it in the web client.
 */
export function getWebUrl(item: JellyfinItem, serverUrl: string): string {
  if (item.Type === "Audio") {
    return `${serverUrl}/web/index.html#!/details?id=${item.Id}`;
  }
  if (item.Type === "MusicAlbum") {
    return `${serverUrl}/web/index.html#!/details?id=${item.Id}`;
  }
  return `${serverUrl}/web/index.html#!/artist.html?id=${item.Id}`;
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** Formats RunTimeTicks (100-nanosecond units) to a "m:ss" string. */
export function formatDuration(ticks?: number): string {
  if (!ticks || ticks <= 0) return "";
  const totalSeconds = Math.floor(ticks / 10_000_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Shows a standardised error toast and optionally clears cached auth. */
export async function handleError(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await showToast({ style: Toast.Style.Failure, title: "Jellyfin Error", message });
}
