import {
  Icon,
  Image,
  MenuBarExtra,
  getPreferenceValues,
  open,
  Clipboard,
  showHUD,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
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
}

export default function NowPlaying() {
  const preferences = getPreferenceValues<Preferences>();
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [artworkPath, setArtworkPath] = useState<string | null>(null);
  const [trackUrl, setTrackUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const data = await getNowPlaying();
      setTrack(data.track);
      setArtworkPath(data.artworkPath);
      setTrackUrl(data.trackUrl);
    } catch {
      setTrack(null);
      setArtworkPath(null);
      setTrackUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
  }, [fetchNowPlaying]);

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

  // Artwork icon for use inside the dropdown
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
          {/* Now Playing header with artwork */}
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={track.name}
              subtitle={track.artist}
              icon={artworkIcon || Icon.Music}
            />
            <MenuBarExtra.Item
              title={track.artist}
              icon={Icon.Person}
              onAction={() => openArtistInMusic(track.artist)}
            />
            <MenuBarExtra.Item
              title={track.album}
              icon={Icon.Cd}
              onAction={() => openAlbumInMusic()}
            />
          </MenuBarExtra.Section>

          {/* Controls */}
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

          {/* Share & Actions */}
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
