import { Icon, MenuBarExtra, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSpotifyIsRunning, runAppleScriptSilently } from "./utils";

type NowPlayingInfo = {
  artworkUrl?: string;
  track?: string;
  artist?: string;
  state?: "playing" | "paused" | "stopped" | "unknown";
};

type Preferences = {
  showTextInMenuBar?: boolean;
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

function infoText(info: NowPlayingInfo) {
  if (!info.artist && !info.track) {
    return undefined;
  }

  if (!info.artist) {
    return info.track;
  }

  if (!info.track) {
    return `Song by ${info.artist}`;
  }

  return `${info.track} by ${info.artist}`;
}

export default function Command() {
  const { showTextInMenuBar } = getPreferenceValues<Preferences>();

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

  const icon = isHttpUrl(info.artworkUrl) ? info.artworkUrl : Icon.Music;

  const trackInfo = infoText(info);
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
