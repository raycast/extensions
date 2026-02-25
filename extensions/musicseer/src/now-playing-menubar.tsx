import { Cache, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { inspectNowPlayingForLookup } from "./media-control";

type NowPlayingState = {
  track: string;
  artist: string;
  album: string;
  artworkUrl: string;
  status: "ok" | "no-track" | "missing-media-control" | "unsupported-platform" | "error";
  error?: string;
};

type Preferences = {
  menuBarTitleTemplate?: string;
  showAlbumArtwork?: boolean;
};

const menubarCache = new Cache({ namespace: "now-playing-menubar" });
const LAST_STATE_CACHE_KEY = "last-state";
const DEFAULT_TITLE_TEMPLATE = "{art} {track} — {artist}";

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
      artworkUrl: state.artworkUrl,
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

function readStringField(payload: unknown, key: string): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTemplate(template?: string): string {
  const trimmed = (template || "").trim();
  return trimmed || DEFAULT_TITLE_TEMPLATE;
}

function menuTitle(state: NowPlayingState, template: string): string {
  if (state.status !== "ok" || !state.track) {
    return "♫";
  }

  const values: Record<string, string> = {
    track: state.track,
    artist: state.artist,
    album: state.album,
  };

  const rendered = template.replace(/\{(track|artist|album)\}/gi, (_, token: string) => {
    return values[token.toLowerCase()] || "";
  });

  // Remove hanging separators when optional values are missing.
  const cleaned = rendered
    .replace(/\s+/g, " ")
    .replace(/\s*([—–|:-])\s*/g, " $1 ")
    .replace(/^[\s—–|:-]+|[\s—–|:-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || state.track;
}

function toArtworkDataUri(data: string, mimeType: string): string {
  const raw = data.trim();
  if (!raw) {
    return "";
  }

  if (/^(https?:\/\/|data:|file:\/\/)/i.test(raw)) {
    return raw;
  }

  const mime = mimeType.trim() || "image/jpeg";
  return `data:${mime};base64,${raw}`;
}

function readArtworkUrl(payload: unknown): string {
  const artworkMimeType = readStringField(payload, "artworkMimeType") || "image/jpeg";
  const artworkData =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>)["artworkData"] : undefined;
  if (typeof artworkData === "string" && artworkData.trim()) {
    return toArtworkDataUri(artworkData, artworkMimeType);
  }
  if (artworkData && typeof artworkData === "object") {
    const dataObject = artworkData as Record<string, unknown>;
    const nestedCandidates = ["url", "src", "data", "image", "artwork_url", "artworkUrl"];
    for (const key of nestedCandidates) {
      const value = dataObject[key];
      if (typeof value === "string" && value.trim()) {
        const nestedMime =
          (typeof dataObject["mimeType"] === "string" && dataObject["mimeType"].trim()) || artworkMimeType;
        return toArtworkDataUri(value, nestedMime);
      }
    }
  }

  const candidates = ["artwork_url", "artworkUrl", "artwork", "album_art_url", "albumArtUrl", "image", "thumbnail"];
  for (const key of candidates) {
    const value = readStringField(payload, key);
    if (value) {
      return value;
    }
  }
  return "";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const titleTemplate = normalizeTemplate(preferences.menuBarTitleTemplate);
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
      if (prev.status === "ok" && prev.track) {
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
      const reusableArtwork = sameAlbum ? prev.artworkUrl : "";
      const resolvedArtworkUrl = artworkUrl || reusableArtwork || "";

      // Keep current menubar entry until artwork for the new media is ready.
      // This avoids changing track/artist first and artwork later.
      if (!resolvedArtworkUrl && prev.status === "ok" && prev.track) {
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
      const artworkUrl = readArtworkUrl(info.payload);

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

    void refreshNowPlaying();
  }, []);

  return (
    <MenuBarExtra
      isLoading={!hasInitialized}
      title={menuTitle(state, titleTemplate)}
      icon={showArtworkInMenuBar ? state.artworkUrl || undefined : undefined}
      tooltip="MusicSeer Now Playing"
    >
      <MenuBarExtra.Section title="Open Command">
        <MenuBarExtra.Item
          title={state.track ? `Get Lyrics for ${state.track}` : "Get Lyrics for Current Track"}
          onAction={async () => {
            await launchCommand({ name: "index", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title={state.artist ? `Get Info for ${state.artist}` : "Get Info for Current Artist"}
          onAction={async () => {
            await launchCommand({ name: "current-artist-bio", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title={state.album ? `Get Info for ${state.album}` : "Get Info for Current Album"}
          onAction={async () => {
            await launchCommand({ name: "current-album-bio", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
