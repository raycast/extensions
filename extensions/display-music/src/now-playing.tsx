import {
  Icon,
  Image,
  MenuBarExtra,
  getPreferenceValues,
  open,
  Clipboard,
  showHUD,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  TrackInfo,
  getNowPlaying,
  togglePlayPause,
  nextTrack,
  previousTrack,
  revealInMusic,
  openArtistInMusic,
  openAlbumInMusic,
} from "./apple-music";

interface Preferences {
  showTrackTitle: boolean;
  showArtistName: boolean;
  hideAfterMinutes: string;
}

export default function NowPlaying() {
  const preferences = getPreferenceValues<Preferences>();
  const hideAfterMs = parseInt(preferences.hideAfterMinutes, 10) * 60 * 1000;
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [artworkPath, setArtworkPath] = useState<string | null>(null);
  const [trackUrl, setTrackUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const pausedSince = useRef<number | null>(null);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const data = await getNowPlaying();
      setTrack(data.track);
      setArtworkPath(data.artworkPath);
      setTrackUrl(data.trackUrl);

      if (data.track && data.track.playerState === "playing") {
        pausedSince.current = null;
        setHidden(false);
      } else {
        if (pausedSince.current === null) {
          pausedSince.current = Date.now();
        } else if (Date.now() - pausedSince.current > hideAfterMs) {
          setHidden(true);
        }
      }
    } catch {
      setTrack(null);
      setArtworkPath(null);
      setTrackUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [hideAfterMs]);

  useEffect(() => {
    fetchNowPlaying();
  }, [fetchNowPlaying]);

  if (hidden) {
    return null;
  }

  let menuBarTitle: string | undefined;
  if (track) {
    const parts: string[] = [];
    if (preferences.showTrackTitle) parts.push(track.name);
    if (preferences.showArtistName) parts.push(track.artist);
    menuBarTitle = parts.length > 0 ? parts.join(" — ") : undefined;
  }

  const menuBarIcon: Image.ImageLike = artworkPath
    ? {
        source: artworkPath,
        mask: Image.Mask.RoundedRectangle,
      }
    : Icon.Music;

  const artworkIcon: Image.ImageLike | undefined = artworkPath
    ? {
        source: artworkPath,
        mask: Image.Mask.RoundedRectangle,
      }
    : undefined;

  if (!track && !isLoading) {
    return (
      <MenuBarExtra icon={Icon.Music} tooltip="Display Music — Nothing playing">
        <MenuBarExtra.Item title="Nothing playing" />
        <MenuBarExtra.Item
          title="Open Apple Music"
          icon={Icon.ArrowRight}
          onAction={() => open("music://")}
        />
      </MenuBarExtra>
    );
  }

  const isPlaying = track?.playerState === "playing";

  return (
    <MenuBarExtra
      icon={menuBarIcon}
      title={menuBarTitle}
      isLoading={isLoading}
      tooltip={track ? `${track.name} — ${track.artist}` : "Display Music"}
    >
      {track && (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={track.name}
              icon={Icon.Music}
              onAction={() => revealInMusic()}
            />
            <MenuBarExtra.Item
              title={track.album}
              icon={artworkIcon || Icon.Cd}
              onAction={() => openAlbumInMusic()}
            />
            <MenuBarExtra.Item
              title={track.artist}
              icon={Icon.Person}
              onAction={() => openArtistInMusic(track.artist)}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Controls">
            <MenuBarExtra.Item
              title={isPlaying ? "Pause" : "Play"}
              icon={isPlaying ? Icon.Pause : Icon.Play}
              shortcut={{ modifiers: [], key: "space" }}
              onAction={async () => {
                await togglePlayPause();
                await fetchNowPlaying();
              }}
            />
            <MenuBarExtra.Item
              title="Previous Track"
              icon={Icon.Rewind}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
              onAction={async () => {
                await previousTrack();
                setTimeout(fetchNowPlaying, 500);
              }}
            />
            <MenuBarExtra.Item
              title="Next Track"
              icon={Icon.Forward}
              shortcut={{ modifiers: [], key: "arrowRight" }}
              onAction={async () => {
                await nextTrack();
                setTimeout(fetchNowPlaying, 500);
              }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            {trackUrl && (
              <MenuBarExtra.Item
                title="Copy Link"
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy(trackUrl);
                  await showHUD("Link copied!");
                }}
              />
            )}
            <MenuBarExtra.Item
              title="Reveal in Music"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => revealInMusic()}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
