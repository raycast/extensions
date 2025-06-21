import { ActionPanel, Action, Detail, Icon, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { runJSInYouTubeMusicTab, resizeYouTubeThumbnail } from "./utils";
import playPause from "./play-pause";
import nextTrack from "./next-track";
import previousTrack from "./previous-track";
import fastForward from "./fast-forward";
import rewind from "./rewind";
import muteUnmute from "./mute-unmute";
import volumeUp from "./volume-up";
import volumeDown from "./volume-down";
import likeButton from "./like-unlike";
import dislikeUndislikeButton from "./dislike-undislike";

interface SongInfo {
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: string;
  currentTime: string;
  year?: string;
  isMuted?: boolean;
  volume?: string;
  isPlaying?: boolean;
  isLiked?: boolean;
  isDisliked?: boolean;
}

const getNowPlayingScript = `
(function() {
  const songTitle = document.querySelector('.title.ytmusic-player-bar')?.textContent || '';
  const playerBarTitle = document.querySelector('.byline.ytmusic-player-bar')?.textContent || '';
  const coverUrl = document.querySelector('.image.ytmusic-player-bar')?.src || '';
  const timeBar = document.querySelector('.time-info')?.textContent?.split(' / ') || '';

  const currentTime = timeBar[0].trim() || '';
  const duration = timeBar[1].trim() || '';

  // Check mute status by looking at volume slider value
  const volumeSlider = document.querySelector('#volume-slider');
  const isMuted = volumeSlider?.getAttribute('value') === '0' || false;
  const volume = volumeSlider?.getAttribute('value') || '0';

  // Check if song is playing
  const mediaElement = document.querySelector('video, audio');
  const isPlaying = !mediaElement?.paused;

  // Check if song is liked
  const likeButton = document.querySelector('ytmusic-like-button-renderer#like-button-renderer yt-button-shape.like button');
  const isLiked = likeButton ? likeButton.ariaPressed.toLowerCase() === 'true' : false;

  // Check if song is disliked
  const dislikeButton = document.querySelector('#button-shape-dislike > button');
  const isDisliked = dislikeButton ? dislikeButton.ariaPressed.toLowerCase() === 'true' : false;

  let album = '';
  let artist = playerBarTitle;
  let year = '';
  if (playerBarTitle.includes(' • ')) {
    const parts = playerBarTitle.split(' • ');
    artist = parts[0] || playerBarTitle;
    album = parts[1] || album;
    year = parts[2] || '';
  }

  return JSON.stringify({
    title: songTitle,
    artist: artist,
    album: album,
    coverUrl: coverUrl,
    duration: duration,
    currentTime: currentTime,
    year: year,
    isMuted: isMuted,
    volume: volume,
    isPlaying: isPlaying,
    isLiked: isLiked,
    isDisliked: isDisliked
  });
})()
`;

export default function Command() {
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noTabFound, setNoTabFound] = useState(false);
  const preferences = getPreferenceValues<{ "ff-rew-seconds": string; renderInterval: string }>();
  const skipSeconds = parseInt(preferences["ff-rew-seconds"]);
  const nowPlayingRenderInterval = parseInt(preferences.renderInterval);

  const fetchNowPlaying = async () => {
    try {
      const result = await runJSInYouTubeMusicTab(getNowPlayingScript);
      if (result === false) {
        setNoTabFound(true);
        return;
      }
      setSongInfo(JSON.parse(result));
      setNoTabFound(false);
    } catch (err) {
      setError("Failed to fetch now playing information: " + err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (noTabFound) return; // Stop interval if no tab found
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, nowPlayingRenderInterval);
    return () => clearInterval(interval);
  }, [noTabFound, nowPlayingRenderInterval]);

  if (noTabFound) {
    return <Detail markdown={"# No matching YouTube Music tab found\nPlease open YouTube Music in your browser."} />;
  }

  if (error) {
    return <Detail markdown={`# Error\n${error}`} />;
  }

  if (isLoading || !songInfo) {
    return <List isLoading={true} />;
  }

  // Update coverUrl to fit the detail view
  const coverUrl = resizeYouTubeThumbnail(songInfo.coverUrl, 350, 350);
  const markdown = coverUrl ? `![Album Cover](${coverUrl})` : undefined;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={songInfo.isPlaying ? "Now Playing ▶️" : "Paused ⏸️"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={"Title"}
            icon={Icon.Music}
            text={(songInfo.isLiked ? "👍 " : "") + songInfo.title}
          />
          <Detail.Metadata.Label title="Artist" text={songInfo.artist} icon={Icon.Person} />
          <Detail.Metadata.Label title="Album" text={songInfo.album} icon={Icon.Music} />
          {songInfo.year && <Detail.Metadata.Label title="Year" text={songInfo.year} icon={Icon.Calendar} />}
          <Detail.Metadata.Label
            title="Duration"
            text={`${songInfo.currentTime} / ${songInfo.duration}`}
            icon={Icon.Clock}
          />
          <Detail.Metadata.Label title="Volume" text={`${songInfo.volume || "0"}%`} icon={getVolumeIcon(songInfo)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Playback">
            <Action
              title={songInfo.isPlaying ? "Pause" : "Play"}
              icon={songInfo.isPlaying ? Icon.Pause : Icon.Play}
              onAction={async () => {
                await playPause(false);
              }}
            />
            <Action
              title="Next Track"
              icon={Icon.ChevronRight}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              onAction={async () => {
                await nextTrack(false);
              }}
            />
            <Action
              title="Previous Track"
              icon={Icon.ChevronLeft}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={async () => {
                await previousTrack(false);
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Seek">
            <Action
              title={`${skipSeconds}s Forward`}
              icon={Icon.Forward}
              shortcut={{ modifiers: [], key: "arrowRight" }}
              onAction={async () => {
                await fastForward(false);
              }}
            />
            <Action
              title={`${skipSeconds}s Backward`}
              icon={Icon.Rewind}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
              onAction={async () => {
                await rewind(false);
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Volume">
            <Action
              title={songInfo.isMuted ? "Unmute" : "Mute"}
              icon={songInfo.isMuted ? Icon.SpeakerOff : Icon.SpeakerOn}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={async () => {
                await muteUnmute(false);
              }}
            />
            <Action
              title="Volume Up"
              icon={Icon.SpeakerHigh}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
              onAction={async () => {
                await volumeUp(false);
              }}
            />
            <Action
              title="Volume Down"
              icon={Icon.SpeakerLow}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
              onAction={async () => {
                await volumeDown(false);
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Reactions">
            <Action
              title={songInfo.isLiked ? "Unlike" : "Like"}
              icon={songInfo.isLiked ? Icon.Undo : Icon.ThumbsUp}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={async () => {
                await likeButton();
              }}
            />
            <Action
              title={songInfo.isDisliked ? "Undislike" : "Dislike"}
              icon={songInfo.isDisliked ? Icon.Undo : Icon.ThumbsDown}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                await dislikeUndislikeButton();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getVolumeIcon(songInfo: SongInfo) {
  const volume = parseInt(songInfo.volume || "0");
  if (volume === 0) {
    return Icon.SpeakerOff;
  } else if (volume <= 33) {
    return Icon.SpeakerLow;
  } else if (volume <= 66) {
    return Icon.SpeakerOn;
  } else {
    return Icon.SpeakerHigh;
  }
}
