import { Action, ActionPanel, Detail, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

interface Song {
  id: string;
  name: string;
  artist: string;
  artwork: string;
  duration: string;
  album: string;
  inLibrary: boolean;
  isPlaying: boolean;
}

interface Preview {
  url: string;
}

interface IsPlayingType {
  status: string;
  is_playing: boolean;
}

interface VolumeNowJson {
  status: string;
  volume: number;
}

interface NowPlayingType {
  status: string;
  info: {
    albumName: string;
    artistName: string;
    artwork: {
      width: number;
      height: number;
      url: string;
    };
    audioLocale: string;
    audioTraits: Array<string>;
    composerName: string;
    discNumber: number;
    durationInMillis: string;
    genreNames: Array<string>;
    hasLyrics: boolean;
    hasTimeSyncedLyrics: boolean;
    isAppleDigitalMaster: boolean;
    isMasteredForItunes: boolean;
    isVocalAttenuationAllowed: boolean;
    isrc: string;
    name: string;
    playParams: {
      id: number;
      kind: string;
    };
    previews: Array<Preview>;
    releaseDate: string;
    trackNumber: number;
    url: string;
    currentPlaybackTime: number;
    remainingTime: number;
    inFavorites: boolean;
    inLibrary: boolean;
    shuffleMode: number;
    repeatMode: number;
  };
}

const preferences = getPreferenceValues<{ token: string }>();
const BASE_URL = "http://localhost:10767/api/v1";
const API_TOKEN = preferences.token;

export default function Command() {
  // Initialize state with the Song type
  const [song, setSong] = useState<Song>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [number, setNumber] = useState(1);
  const [vol, setVolume] = useState("");

  useEffect(() => {
    async function fetchSong() {
      try {
        const [nowPlayingRes, isPlayingRes] = await Promise.all([
          fetch(`${BASE_URL}/playback/now-playing`, { method: "GET", headers: { apiToken: API_TOKEN } }),
          fetch(`${BASE_URL}/playback/is-playing`, {
            method: "GET",
            headers: { apiToken: API_TOKEN },
          }),
        ]);

        const volumeNowRes = await fetch(`${BASE_URL}/playback/volume`, {
          method: "GET",
          headers: {
            apiToken: API_TOKEN,
          },
        });

        if (!volumeNowRes.ok) {
          await showToast({
            title: `Failed to add song to library`,
            style: Toast.Style.Failure,
          });
        }

        if (!nowPlayingRes.ok) throw new Error("Failed to fetch song");

        const volumeNowJson = (await volumeNowRes.json()) as VolumeNowJson;
        const isPlayingJson = (await isPlayingRes.json()) as IsPlayingType;
        const nowPlayingJson = (await nowPlayingRes.json()) as NowPlayingType;

        setVolume(volumeNowJson.volume.toString());
        setSong({
          id: nowPlayingJson.info.playParams.id.toString(),
          name: nowPlayingJson.info.name,
          album: nowPlayingJson.info.albumName || "no album",
          artist: nowPlayingJson.info.artistName,
          artwork: nowPlayingJson.info?.artwork?.url?.replace("{w}x{h}", "1200x1200") || Icon.Music,
          duration: `${Math.floor(parseInt(nowPlayingJson.info.durationInMillis) / 60000)}:${Math.floor(parseInt(nowPlayingJson.info.durationInMillis) / 1000) % 60}`,
          inLibrary: nowPlayingJson.info.inLibrary.toString() == "true",
          isPlaying: isPlayingJson.is_playing.toString() != "false",
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error fetching song",
          message: String(error),
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSong();
  }, [number]);

  async function play_pause() {
    try {
      const response = await fetch(`${BASE_URL}/playback/playpause`, {
        method: "POST",
        headers: {
          apiToken: API_TOKEN,
        },
      });

      if (!response.ok)
        await showToast({
          title: `Failed to Play/Pause the music`,
          style: Toast.Style.Failure,
        });

      await showToast({
        title: `Play/Pause`,
        style: Toast.Style.Success,
      });
      setNumber(Math.random());
    } catch (e) {
      console.error("Erroy encounterd:", e);
      await showToast({
        title: `Failed to Play/Pause the music`,
        style: Toast.Style.Failure,
      });
    }
  }

  async function next() {
    try {
      const response = await fetch(`${BASE_URL}/playback/next`, {
        method: "POST",
        headers: {
          apiToken: API_TOKEN,
        },
      });

      if (!response.ok) {
        await showToast({
          title: `Failed to play the next track`,
          style: Toast.Style.Failure,
        });
        return;
      }

      await showToast({
        title: `Next`,
        style: Toast.Style.Success,
      });
      setNumber(Math.random());
    } catch (e) {
      console.error("Erroy encounterd:", e);
      await showToast({
        title: `Failed to play the next track`,
        style: Toast.Style.Failure,
      });
    }
  }

  async function previous() {
    try {
      const response = await fetch(`${BASE_URL}/playback/previous`, {
        method: "POST",
        headers: {
          apiToken: API_TOKEN,
        },
      });

      if (!response.ok) {
        await showToast({
          title: `Failed to play the previous track`,
          style: Toast.Style.Failure,
        });
        return;
      }

      await showToast({
        title: `Previous`,
        style: Toast.Style.Success,
      });
      setNumber(Math.random());
    } catch (e) {
      console.error("Erroy encounterd:", e);
      await showToast({
        title: `Failed to play the previous track`,
        style: Toast.Style.Failure,
      });
    }
  }

  async function addToLibrary() {
    try {
      const response = await fetch(`${BASE_URL}/playback/add-to-library`, {
        method: "POST",
        headers: {
          apiToken: API_TOKEN,
        },
      });

      if (!response.ok) {
        await showToast({
          title: `Failed to add song to library`,
          style: Toast.Style.Failure,
        });
        return;
      }

      await showToast({
        title: `Added song to library`,
        style: Toast.Style.Success,
      });
      setNumber(Math.random());
    } catch (e) {
      console.error("Erroy encounterd:", e);
      await showToast({
        title: `Failed to add song to library`,
        style: Toast.Style.Failure,
      });
    }
  }

  // async function like() {
  //   try {
  //     const response = await fetch(`${BASE_URL}/playback/add-to-library`, {
  //       method: "POST",
  //       headers: {
  //         apiToken: API_TOKEN,
  //       },
  //     });

  //     if (!response.ok) {
  //       await showToast({
  //         title: `Failed to add song to library`,
  //         style: Toast.Style.Failure,
  //       });
  //       return;
  //     }

  //     await showToast({
  //       title: `Added song to library`,
  //       style: Toast.Style.Success,
  //     });
  //     setNumber(Math.random());
  //   } catch (e) {
  //     console.error("Erroy encounterd:", e);
  //     await showToast({
  //       title: `Failed to add song to library`,
  //       style: Toast.Style.Failure,
  //     });
  //   }
  // }

  async function remove() {
    try {
      await showToast({
        title: `This does not work right now `,
        style: Toast.Style.Failure,
      });
      setNumber(Math.random());
    } catch (e) {
      console.error("Erroy encounterd:", e);
      await showToast({
        title: `Failed to add song to library`,
        style: Toast.Style.Failure,
      });
    }
  }

  async function change_volume(variation: number) {
    try {
      const volumeNowRes = await fetch(`${BASE_URL}/playback/volume`, {
        method: "GET",
        headers: {
          apiToken: API_TOKEN,
        },
      });

      if (!volumeNowRes.ok) {
        await showToast({
          title: `Failed to add song to library`,
          style: Toast.Style.Failure,
        });
      }

      const json = (await volumeNowRes.json()) as VolumeNowJson;

      let volume = json.volume + variation;

      if (volume < 0.05 && variation < 0) {
        volume = 0;
      }

      if (volume > 0.95 && variation > 0) {
        volume = 1;
      }

      setVolume(volume.toString());

      const response = await fetch(`${BASE_URL}/playback/volume`, {
        method: "POST",
        headers: {
          apiToken: API_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          volume: volume,
        }),
      });

      if (!response.ok) {
        await showToast({
          title: `Failed to add song to library`,
          style: Toast.Style.Failure,
        });
      }
    } catch (e) {
      console.error("Erroy encounterd:", e);
      await showToast({
        title: `Failed to add song to library`,
        style: Toast.Style.Failure,
      });
    }
  }

  // Construct Markdown for the left side
  const markdown = song
    ? `
# **${song.artist}**
${song.name}

<img src="${song.artwork}" width="240" />
    `
    : "# No Song Data Found";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        song && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Track" text={song.name} />
            <Detail.Metadata.Label title="Artist" text={song.artist} />
            <Detail.Metadata.Label title="Duration" text={song.duration} />
            <Detail.Metadata.Label title="Album" text={song.album} />
            <Detail.Metadata.Label title="Volume" text={parseFloat(vol).toPrecision(2)} />
          </Detail.Metadata>
        )
      }
      actions={
        song && (
          <ActionPanel>
            <Action
              title={song.isPlaying ? "Pause" : "Play"}
              icon={song.isPlaying ? Icon.Pause : Icon.Play}
              onAction={() => play_pause()}
            />
            <Action
              title={song.inLibrary ? "Remove from Library" : "Add to Library"}
              icon={song.inLibrary ? Icon.Xmark : Icon.Plus}
              onAction={() => {
                if (!song.inLibrary) addToLibrary();
                if (song.inLibrary) remove();
              }}
            />
            <Action
              title="Next"
              icon={Icon.Forward}
              onAction={() => next()}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
            />
            <Action
              title="Previous"
              icon={{ source: Icon.Rewind }}
              onAction={() => previous()}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            />
            <Action
              title="Volume up"
              icon={{ source: Icon.ArrowUp }}
              onAction={() => change_volume(0.05)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
            />
            <Action
              title="Volume Down"
              icon={{ source: Icon.ArrowDown }}
              onAction={() => change_volume(-0.05)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
            />
          </ActionPanel>
        )
      }
    />
  );
}
