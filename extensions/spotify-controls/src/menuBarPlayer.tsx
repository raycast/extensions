import { useEffect, useState } from "react";

import { runAppleScript } from "run-applescript";

import { getPreferenceValues, Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";

import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";

type NowPlayingInfo = {
  artworkUrl?: string;
  track?: string;
  artist?: string;
  state?: "playing" | "paused" | "stopped" | "unknown";
};

type Preferences = {
  showTextInMenuBar?: boolean;
  hideIconWhenIdle?: boolean;
  hideArtistName?: boolean;
  cleanupSongTitle?: boolean;
  nowPlayingTextLength?: string;
  menuBarIcon?: "spotify" | "artwork" | "music";
};

function parseNowPlayingInfo(raw: string): NowPlayingInfo {
  const [artworkUrl, track, artist, state] = raw.split("||").map((s) => s.trim());
  const normalizedState =
    state === "playing" || state === "paused" || state === "stopped" ? (state as NowPlayingInfo["state"]) : "unknown";

  return {
    artworkUrl: artworkUrl || undefined,
    track: track || undefined,
    artist: artist || undefined,
    state: normalizedState,
  };
}

async function getNowPlayingInfo(): Promise<NowPlayingInfo> {
  const script = `
    if application "Spotify" is not running then
      return "||||||stopped"
    end if

    property _artworkUrl : ""
    property _trackName : ""
    property _artistName : ""
    property _playerState : "unknown"

    tell application "Spotify"
      try
        set _playerState to player state as string
        set _trackName to name of current track
        set _artistName to artist of current track
        set _artworkUrl to artwork url of current track
      end try
    end tell

    return _artworkUrl & "||" & _trackName & "||" & _artistName & "||" & _playerState
  `;

  const raw = await runAppleScript(script);
  return parseNowPlayingInfo(raw);
}

function isHttpUrl(value?: string) {
  return !!value && (value.startsWith("https://") || value.startsWith("http://"));
}

function cleanTrackTitle(track?: string) {
  if (!track) {
    return undefined;
  }

  return track
    .replace(/\s*[-–—]\s*remaster(?:ed)?(?:\s*\d{4})?$/i, "")
    .replace(/\s*\((?:[^)]*version|[^)]*remaster(?:ed)?[^)]*)\)$/i, "")
    .replace(/\s*\[(?:[^\]]*version|[^\]]*remaster(?:ed)?[^\]]*)\]$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength <= 1) {
    return "…";
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function infoText(
  info: NowPlayingInfo,
  options: {
    hideArtistName?: boolean;
    cleanupSongTitle?: boolean;
    nowPlayingTextLength: number;
  },
) {
  const track = options.cleanupSongTitle ? cleanTrackTitle(info.track) : info.track;

  if (!info.artist && !track) {
    return undefined;
  }

  if (!info.artist || options.hideArtistName) {
    return track ? truncate(track, options.nowPlayingTextLength) : undefined;
  }

  if (!track) {
    return `Song by ${info.artist}`;
  }

  return truncate(`${track} by ${info.artist}`, options.nowPlayingTextLength);
}

function getIcon(
  info: NowPlayingInfo,
  options: {
    menuBarIcon: "spotify" | "artwork" | "music";
    hideIconWhenIdle?: boolean;
  },
) {
  const isIdle = info.state !== "playing";
  if (options.hideIconWhenIdle && isIdle) {
    return undefined;
  }

  if (options.menuBarIcon === "music") {
    return Icon.Music;
  }

  if (options.menuBarIcon === "artwork") {
    return isHttpUrl(info.artworkUrl) ? info.artworkUrl : "icon.png";
  }

  return "icon.png";
}

export default function Command() {
  const { showTextInMenuBar, hideArtistName, cleanupSongTitle, hideIconWhenIdle, nowPlayingTextLength, menuBarIcon } =
    getPreferenceValues<Preferences>();

  const [isLoading, setIsLoading] = useState(true);
  const [info, setInfo] = useState<NowPlayingInfo>({ state: "unknown" });

  useEffect(() => {
    let mounted = true;

    getNowPlayingInfo()
      .then((next) => {
        if (!mounted) return;
        setInfo(next);
      })
      .then(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const parsedTextLength = Number.parseInt(nowPlayingTextLength ?? "30", 10);
  const maxTextLength = Number.isFinite(parsedTextLength) && parsedTextLength > 0 ? parsedTextLength : 30;
  const icon = getIcon(info, {
    menuBarIcon: menuBarIcon ?? "spotify",
    hideIconWhenIdle,
  });

  const trackInfo = infoText(info, {
    hideArtistName,
    cleanupSongTitle,
    nowPlayingTextLength: maxTextLength,
  });
  return (
    <MenuBarExtra icon={icon} isLoading={isLoading} title={showTextInMenuBar ? trackInfo : undefined}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={trackInfo ? trackInfo : "Not playing"} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={info.state === "playing" ? "Pause" : "Play"}
          onAction={async () => {
            await runAppleScriptSilently(buildScriptEnsuringSpotifyIsRunning(`playpause`));
          }}
          icon={info.state === "playing" ? Icon.Pause : Icon.Play}
        />
        <MenuBarExtra.Item
          title="Next"
          icon={Icon.Forward}
          onAction={async () => {
            await runAppleScriptSilently(buildScriptEnsuringSpotifyIsRunning(`next track`));
          }}
        />
        <MenuBarExtra.Item
          title="Previous"
          icon={Icon.Rewind}
          onAction={async () => {
            await runAppleScriptSilently(buildScriptEnsuringSpotifyIsRunning(`previous track`));
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Configure Command" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
