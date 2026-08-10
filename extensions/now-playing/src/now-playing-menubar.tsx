import { Cache, Icon, MenuBarExtra, getPreferenceValues, open } from "@raycast/api";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { access, mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useEffect, useRef, useState } from "react";
import { inspectNowPlayingForLookup, readStringField } from "./media-control";
import {
  type MenuBarDisplayMode,
  type MenuBarState,
  menuTitle,
  shouldShowMenuBarArtwork,
} from "./now-playing-menubar-display";

type NowPlayingState = MenuBarState & {
  error?: string;
};

type NowPlayingMenubarPreferences = {
  menuBarDisplayMode?: MenuBarDisplayMode;
  menuBarTitleTemplate?: string;
  showAlbumArtwork?: boolean;
};

const menubarCache = new Cache({ namespace: "now-playing-menubar" });
const LAST_STATE_CACHE_KEY = "last-state";
const ARTWORK_CACHE_DIR = join(tmpdir(), "raycast-now-playing-artwork");

function normalizeArtworkUrl(value: string): string {
  if (!value || value.startsWith("data:")) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("file://")) {
    const decodedPath = decodeURIComponent(value.replace(/^file:\/\//, ""));
    return existsSync(decodedPath) ? decodedPath : "";
  }

  if (value.startsWith("/") && existsSync(value)) {
    return value;
  }

  return "";
}

function defaultState(): NowPlayingState {
  return {
    track: "",
    artist: "",
    album: "",
    artworkUrl: "",
    status: process.platform === "darwin" ? "no-track" : "unsupported-platform",
  };
}

function readCachedState(): NowPlayingState | null {
  const raw = menubarCache.get(LAST_STATE_CACHE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const state = parsed as Partial<NowPlayingState>;
    if (
      typeof state.track !== "string" ||
      typeof state.artist !== "string" ||
      typeof state.album !== "string" ||
      typeof state.artworkUrl !== "string" ||
      !state.status
    ) {
      return null;
    }
    return {
      track: state.track,
      artist: state.artist,
      album: state.album,
      artworkUrl: normalizeArtworkUrl(state.artworkUrl),
      status: state.status,
      error: typeof state.error === "string" ? state.error : undefined,
    };
  } catch {
    return null;
  }
}

function writeCachedState(state: NowPlayingState) {
  if (state.status !== "ok" || !state.track) {
    return;
  }
  menubarCache.set(LAST_STATE_CACHE_KEY, JSON.stringify(state));
}

function artworkFileExtension(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  switch (normalized) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/heic":
    case "image/heif":
      return "heic";
    default:
      return "jpg";
  }
}

async function pruneArtworkCache(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const entries = await readdir(ARTWORK_CACHE_DIR, { withFileTypes: true });
    const now = Date.now();

    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const filePath = join(ARTWORK_CACHE_DIR, entry.name);
          const { mtimeMs } = await stat(filePath);
          if (now - mtimeMs > maxAgeMs) {
            await unlink(filePath);
          }
        }),
    );
  } catch {
    // Ignore cache cleanup failures; artwork lookup should still continue.
  }
}

async function persistArtwork(raw: string, mimeType: string): Promise<string> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed)) {
    return normalizeArtworkUrl(trimmed);
  }

  if (trimmed.startsWith("/")) {
    try {
      await access(trimmed);
      return trimmed;
    } catch {
      // Fall through and treat non-existent leading-slash values as base64 payloads.
    }
  }

  let base64 = trimmed;
  let resolvedMimeType = mimeType.trim() || "image/jpeg";
  const dataUriMatch = /^data:([^;,]+);base64,(.+)$/i.exec(trimmed);
  if (dataUriMatch) {
    resolvedMimeType = dataUriMatch[1] || resolvedMimeType;
    base64 = dataUriMatch[2] || "";
  }

  try {
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length) {
      return "";
    }

    const fileName = `${createHash("sha1").update(resolvedMimeType).update(":").update(base64).digest("hex")}.${artworkFileExtension(resolvedMimeType)}`;
    const filePath = join(ARTWORK_CACHE_DIR, fileName);
    await mkdir(ARTWORK_CACHE_DIR, { recursive: true });
    await writeFile(filePath, buffer);
    return filePath;
  } catch {
    return "";
  }
}

async function readArtworkUrl(payload: unknown): Promise<string> {
  const artworkMimeType = readStringField(payload, "artworkMimeType") || "image/jpeg";
  const artworkData =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>)["artworkData"] : undefined;
  if (typeof artworkData === "string" && artworkData.trim()) {
    return persistArtwork(artworkData, artworkMimeType);
  }
  if (artworkData && typeof artworkData === "object") {
    const dataObject = artworkData as Record<string, unknown>;
    const nestedCandidates = ["url", "src", "data", "image", "artwork_url", "artworkUrl"];
    for (const key of nestedCandidates) {
      const value = dataObject[key];
      if (typeof value === "string" && value.trim()) {
        const nestedMime =
          (typeof dataObject["mimeType"] === "string" && dataObject["mimeType"].trim()) || artworkMimeType;
        return persistArtwork(value, nestedMime);
      }
    }
  }

  const candidates = ["artwork_url", "artworkUrl", "artwork", "album_art_url", "albumArtUrl", "image", "thumbnail"];
  for (const key of candidates) {
    const value = readStringField(payload, key);
    if (value) {
      return persistArtwork(value, artworkMimeType);
    }
  }
  return "";
}

export default function Command() {
  const preferences = getPreferenceValues<NowPlayingMenubarPreferences>();
  const displayMode = preferences.menuBarDisplayMode ?? "track-artist";
  const titleTemplate = preferences.menuBarTitleTemplate;
  const showArtworkInMenuBar = preferences.showAlbumArtwork ?? true;
  const cachedState = readCachedState();
  const [hasInitialized, setHasInitialized] = useState(!!cachedState);
  const [state, setState] = useState<NowPlayingState>(cachedState || defaultState());
  const inFlightRef = useRef(false);

  function setStateIfChanged(next: NowPlayingState) {
    setState((prev) => {
      if (
        prev.track === next.track &&
        prev.artist === next.artist &&
        prev.album === next.album &&
        prev.artworkUrl === next.artworkUrl &&
        prev.status === next.status &&
        prev.error === next.error
      ) {
        return prev;
      }
      return next;
    });
  }

  function setStatePreservingLastNowPlaying(next: NowPlayingState) {
    setState((prev) => {
      if (next.status === "no-track" && prev.status === "ok" && prev.track) {
        return prev;
      }
      if (
        prev.track === next.track &&
        prev.artist === next.artist &&
        prev.album === next.album &&
        prev.artworkUrl === next.artworkUrl &&
        prev.status === next.status &&
        prev.error === next.error
      ) {
        return prev;
      }
      return next;
    });
  }

  function setNowPlayingState(track: string, artist: string, album: string, artworkUrl: string) {
    setState((prev) => {
      const sameAlbum = !!prev.album && !!album && prev.album === album;
      const sameMedia = prev.track === track && prev.artist === artist && prev.album === album;
      const reusableArtwork = sameAlbum ? prev.artworkUrl : "";
      const resolvedArtworkUrl = artworkUrl || reusableArtwork || "";

      // Keep current menubar entry until artwork for the new media is ready.
      // This avoids changing track/artist first and artwork later.
      if (!resolvedArtworkUrl && sameMedia && prev.status === "ok" && prev.track) {
        return prev;
      }

      const next: NowPlayingState = {
        track,
        artist,
        album,
        artworkUrl: resolvedArtworkUrl,
        status: "ok",
      };
      writeCachedState(next);

      if (
        prev.track === next.track &&
        prev.artist === next.artist &&
        prev.album === next.album &&
        prev.artworkUrl === next.artworkUrl &&
        prev.status === next.status &&
        prev.error === next.error
      ) {
        return prev;
      }

      return next;
    });
  }

  async function refreshNowPlaying() {
    if (inFlightRef.current || process.platform !== "darwin") {
      return;
    }

    inFlightRef.current = true;
    try {
      const info = await inspectNowPlayingForLookup("track", { allowCacheFallbackOnIneligible: true });
      const track = readStringField(info.payload, "title");
      const artist = readStringField(info.payload, "artist");
      const album = readStringField(info.payload, "album");
      const artworkUrl = await readArtworkUrl(info.payload);

      if (info.isNotInstalled) {
        setStateIfChanged({
          track: "",
          artist: "",
          album: "",
          artworkUrl: "",
          status: "missing-media-control",
          error: info.error || undefined,
        });
      } else if (track) {
        setNowPlayingState(track, artist, album, artworkUrl);
      } else if (info.query || info.payload) {
        setStatePreservingLastNowPlaying({
          track: "",
          artist: "",
          album: "",
          artworkUrl: "",
          status: "no-track",
        });
      } else {
        setStatePreservingLastNowPlaying({
          track: "",
          artist: "",
          album: "",
          artworkUrl: "",
          status: "error",
          error: info.error || undefined,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatePreservingLastNowPlaying({
        track: "",
        artist: "",
        album: "",
        artworkUrl: "",
        status: "error",
        error: message,
      });
    } finally {
      setHasInitialized(true);
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    if (process.platform !== "darwin") {
      setStateIfChanged({
        track: "",
        artist: "",
        album: "",
        artworkUrl: "",
        status: "unsupported-platform",
      });
      return;
    }

    void pruneArtworkCache();
    void refreshNowPlaying();
  }, []);

  const menuBarIcon =
    state.status === "missing-media-control"
      ? Icon.XMarkCircleFilled
      : shouldShowMenuBarArtwork(displayMode, showArtworkInMenuBar) && state.artworkUrl
        ? { source: state.artworkUrl }
        : undefined;

  return (
    <MenuBarExtra
      isLoading={!hasInitialized}
      title={menuTitle(state, displayMode, titleTemplate)}
      icon={menuBarIcon}
      tooltip="Now Playing"
    >
      {state.status === "missing-media-control" ? (
        <MenuBarExtra.Section title="Install media-control">
          <MenuBarExtra.Item title="1) brew install media-control" />
          <MenuBarExtra.Item
            title="Open Homebrew Formula"
            onAction={async () => {
              await open("https://formulae.brew.sh/formula/media-control");
            }}
          />
          <MenuBarExtra.Item
            title="Open media-control Repository"
            onAction={async () => {
              await open("https://github.com/ungive/media-control");
            }}
          />
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}
