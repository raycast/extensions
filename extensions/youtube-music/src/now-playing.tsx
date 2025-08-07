import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { runJSInYouTubeMusicTab } from "./utils";
import { getNowPlayingConfig } from "./infra/preference";
import type { SongInfo, VideoInfo, ContentInfo } from "./models/now-playing";
import SongView from "./ui/views/song-view";
import VideoView from "./ui/views/music-video-view";

// Shared helpers code for both scripts
const sharedHelpers = `
  // Check if the current URL matches the expected platform
  function checkPlatform(platform) {
    const url = window.location.href;
    const urlObj = new URL(url);
    const currentPlatform = urlObj.hostname.includes('music.youtube.com') ? 'music' : 'youtube';
    return currentPlatform === platform;
  }

  // Format time in minutes:seconds
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // Get video element properties
  function getVideoElementProps() {
    const mediaElement = document.querySelector('video');
    return {
      currentTime: mediaElement ? formatTime(mediaElement.currentTime) : '',
      duration: mediaElement ? formatTime(mediaElement.duration) : '',
      isMuted: mediaElement ? mediaElement.muted : false,
      volume: mediaElement ? Math.round(mediaElement.volume * 100).toString() : '0',
      isPlaying: mediaElement ? !mediaElement.paused : false
    };
  }
`;

const nowPlayingMusicScript = `(() => {
  ${sharedHelpers}
  if (!checkPlatform('music')) {
    return "";
  }

  // Check if the current song is a proper song or a video played on youtube music
  function isProperSong() {
    const button = document.querySelector('button.song-button.style-scope.ytmusic-av-toggle');
    const isPressed = button?.getAttribute('aria-pressed');
    return isPressed === 'true';
  }

  // Get the properties of the current content
  const songTitle = document.querySelector('.title.ytmusic-player-bar')?.textContent || '';
  const playerBarTitle = document.querySelector('.byline.ytmusic-player-bar')?.textContent || '';
  const coverUrl = document.querySelector('.image.ytmusic-player-bar')?.src || '';
  const videoProps = getVideoElementProps();
  const likeButton = document.querySelector('ytmusic-like-button-renderer#like-button-renderer yt-button-shape.like button');
  const isLiked = likeButton ? likeButton.ariaPressed.toLowerCase() === 'true' : false;
  const dislikeButton = document.querySelector('#button-shape-dislike > button');
  const isDisliked = dislikeButton ? dislikeButton.ariaPressed.toLowerCase() === 'true' : false;
  let uiScreen = isProperSong() ? 'song' : 'video';
  
  const parts = playerBarTitle.split('•');
  const firstPart = parts[0].trim() || playerBarTitle;
  let album = '';
  let year = '';
  if (parts.length > 1) {
    album = parts[1].trim() || album;
    year = parts[2].trim() || '';
  }
  
  if (uiScreen === 'song') {
    return JSON.stringify({
      platform: 'music',
      uiScreen: 'song',
      title: songTitle,
      artist: firstPart,
      album: album,
      coverUrl: coverUrl,
      duration: videoProps.duration,
      currentTime: videoProps.currentTime,
      year: year,
      isMuted: videoProps.isMuted,
      volume: videoProps.volume,
      isPlaying: videoProps.isPlaying,
      isLiked: isLiked,
      isDisliked: isDisliked
    });
  } else {
    return JSON.stringify({
      platform: 'music',
      uiScreen: 'video',
      title: songTitle,
      channel: firstPart,
      views: album,
      coverUrl: coverUrl,
      duration: videoProps.duration,
      currentTime: videoProps.currentTime,
      likes: year,
      isMuted: videoProps.isMuted,
      volume: videoProps.volume,
      isPlaying: videoProps.isPlaying,
      isLiked: isLiked,
      isDisliked: isDisliked
    });
  }
})()`;

const nowPlayingYouTubeScript = `(() => {
  ${sharedHelpers}
  if (!checkPlatform('youtube')) {
    return "";
  }

  // Get the properties of the current content
  const title = document.querySelector('#container h1.title')?.textContent || '';
  // const likes = document.querySelector('ytd-toggle-button-renderer[is-icon-button][aria-pressed]')?.getAttribute('aria-label') || '';
  const views = document.querySelector('.view-count')?.textContent || '';
  const videoProps = getVideoElementProps();
  const url = window.location.href;
  const urlObj = new URL(url);
  const videoId = urlObj.searchParams.get("v");
  var coverUrl = videoId ? 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg' : '';
  
  const ytLikeButton = document.querySelector("#top-level-buttons-computed > segmented-like-dislike-button-view-model > yt-smartimation > div > div > like-button-view-model > toggle-button-view-model > button-view-model > button");
  let isLiked = false;
  const likes = ytLikeButton?.querySelector(".yt-spec-button-shape-next__button-text-content")?.textContent.trim() || '';
  if (ytLikeButton && ytLikeButton.getAttribute("aria-pressed") === "true") {
    isLiked = true;
  }

  let channel = '';
  const channelElem = document.querySelector('ytd-channel-name#channel-name a');
  if (channelElem) {
    channel = channelElem.textContent || '';
  }
  return JSON.stringify({
    platform: 'youtube',
    uiScreen: 'video',
    title: title,
    likes: likes,
    views: views,
    duration: videoProps.duration,
    currentTime: videoProps.currentTime,
    volume: videoProps.volume,
    coverUrl: coverUrl,
    videoId: videoId,
    url: url,
    isLiked: isLiked,
    channel: channel,
    isMuted: videoProps.isMuted,
    isPlaying: videoProps.isPlaying,
  });
})()`;

async function fetchNowPlayingYoutubeMusic(): Promise<SongInfo | VideoInfo | null> {
  const result = await runJSInYouTubeMusicTab(nowPlayingMusicScript);
  if (!result) return null;
  return JSON.parse(result) as SongInfo | VideoInfo;
}

async function fetchNowPlayingYouTube(): Promise<VideoInfo | null> {
  const result = await runJSInYouTubeMusicTab(nowPlayingYouTubeScript);
  if (!result) return null;
  return JSON.parse(result) as VideoInfo;
}

export default function Command() {
  const [contentInfo, setContentInfo] = useState<ContentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const preferences = getNowPlayingConfig();
  const skipSeconds = preferences.ffRewSeconds;
  const nowPlayingRenderInterval = preferences.renderInterval;

  const fetchNowPlaying = async () => {
    // Prevent concurrent execution
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;

    try {
      let result: ContentInfo | null = null;
      const urlPref = preferences.urlPreference;

      switch (urlPref) {
        case "music":
          result = await fetchNowPlayingYoutubeMusic();
          break;
        case "youtube":
          result = await fetchNowPlayingYouTube();
          break;
        case "both":
          result = (await fetchNowPlayingYoutubeMusic()) || (await fetchNowPlayingYouTube());
          break;
      }

      setContentInfo(result);
    } catch (err) {
      setError("Failed to fetch now playing information: " + err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, nowPlayingRenderInterval);
    return () => clearInterval(interval);
  }, [nowPlayingRenderInterval]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch now playing information",
        message: error,
      });
    }
  }, [error]);

  if (!contentInfo) {
    return <Detail isLoading={isLoading} />;
  }

  switch (contentInfo.uiScreen) {
    case "song":
      return <SongView songInfo={contentInfo} skipSeconds={skipSeconds} isLoading={isLoading} />;
    case "video":
      return <VideoView videoInfo={contentInfo} skipSeconds={skipSeconds} isLoading={isLoading} />;
  }
}
