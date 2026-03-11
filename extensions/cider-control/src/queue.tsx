import { List, ActionPanel, Action, showToast, Toast, Icon, Image, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

// Config
const preferences = getPreferenceValues<{ token: string }>();
const BASE_URL = "http://localhost:10767/api/v1";
const API_TOKEN = preferences.token;

interface Song {
  id: string;
  name: string;
  artist: string;
  url: string;
  artwork: string;
  index_queue: string;
  album: string;
  genre: Array<string>;
  duration: string;
  release_date: string;
}

interface Assets {
  flavor: string;
  URL: string;
  downloadKey: string;
  artworkURL: string;
  "file-size": number;
  md5: string;
  chunks: {
    chunkSize: number;
    hashes: Array<string>;
  };
  metadata: {
    composerId: string;
    genreId: number;
    copyright: string;
    year: number;
    "sort-artist": string;
    isMasteredForItunes: boolean;
    vendorId: number;
    artistId: string;
    duration: number;
    discNumber: number;
    itemName: string;
    trackCount: number;
    xid: string;
    bitRate: number;
    fileExtension: string;
    "sort-album": string;
    genre: string;
    rank: number;
    "sort-name": string;
    playlistId: string;
    "sort-composer": string;
    comments: string;
    trackNumber: number;
    releaseDate: string;
    kind: string;
    playlistArtistName: string;
    gapless: boolean;
    composerName: string;
    discCount: number;
    sampleRate: number;
    playlistName: string;
    explicit: number;
    itemId: string;
    s: number;
    compilation: boolean;
    artistName: string;
  };
}

interface Preview {
  url: string;
}

interface SongQueue {
  id: string;
  type: string;
  assetURL: string;
  hlsMetadata: Array<string>;
  flavor: string;
  attributes: {
    albumName: string;
    hasTimeSyncedLyrics: boolean;
    genreNames: Array<string>;
    trackNumber: number;
    durationInMillis: number;
    releaseDate: string;
    isVocalAttenuationAllowed: boolean;
    isMasteredForItunes: boolean;
    isrc: string;
    artwork: {
      width: number;
      height: number;
      url: string;
    };
    composerName: string;
    audioLocale: string;
    playParams: {
      id: string;
      kind: string;
    };
    url: string;
    discNumber: number;
    isAppleDigitalMaster: boolean;
    hasLyrics: boolean;
    audioTraits: Array<string>;
    name: string;
    previews: Array<Preview>;
    artistName: string;
    currentPlaybackTime: number;
    remainingTime: number;
  };
  playbackType: number;
  _container: {
    id: string;
    type: string;
    href: string;
    attributes: {
      requiresSubscription: boolean;
      isLive: boolean;
      kind: string;
      radioUrl: string;
      mediaKind: string;
      name: string;
      artwork: {
        width: number;
        url: string;
        height: number;
        textColor3: string;
        textColor2: string;
        textColor4: string;
        textColor1: string;
        bgColor: string;
        hasP3: boolean;
      };
      url: string;
      playParams: {
        id: string;
        kind: string;
        format: string;
        stationHash: string;
        hasDrm: boolean;
        mediaType: number;
      };
    };
    name: string;
  };
  _context: {
    featureName: string;
  };
  _state: {
    current: number;
  };
  _songId: string;
  assets: Array<Assets>;
  keyURLs: {
    "hls-key-cert-url": string;
    "hls-key-server-url": string;
    "widevine-cert-url": string;
  };
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

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);

  let id_now_playing = "";
  let startIndex = 0;

  const headers = {
    apitoken: API_TOKEN,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    async function update() {
      setIsLoading(true);
      try {
        const json = (await getQueue()) as Array<SongQueue>;

        setSongs(
          json.map((s: SongQueue, idx: number) => ({
            id: s.id,
            name: s.attributes.name,
            artist: s.attributes.artistName,
            url: s.attributes.url,
            artwork: s.attributes.artwork?.url.replace("{w}x{h}", "640x640") || Icon.Music,
            index_queue: idx.toString(),
            album: s.attributes?.albumName.toString(),
            genre: s.attributes?.genreNames,
            duration: `${Math.floor(s.attributes.durationInMillis / 60000)}:${Math.floor(s.attributes.durationInMillis / 1000) % 60}`,
            release_date: `${s.attributes.releaseDate.toString().split("T")[0].split("-")[2]}/${s.attributes.releaseDate.toString().split("T")[0].split("-")[1]}/${s.attributes.releaseDate.toString().split("T")[0].split("-")[0]}`,
          })),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    update();
  }, [searchText]);

  async function getQueue() {
    const [queueRes, nowPlayingRes] = await Promise.all([
      fetch(`${BASE_URL}/playback/queue`, { method: "GET", headers }),
      fetch(`${BASE_URL}/playback/now-playing`, {
        method: "GET",
        headers: { apiToken: API_TOKEN },
      }),
    ]);

    if (!queueRes.ok || !nowPlayingRes.ok) throw new Error("Cider Connection Error");

    const queueData = (await queueRes.json()) as Array<SongQueue>;
    const nowPlayingData = (await nowPlayingRes.json()) as NowPlayingType;

    if (nowPlayingData.info.playParams != undefined) {
      console.log(nowPlayingData.info.playParams);
      id_now_playing = nowPlayingData.info.playParams.id.toString();
    }

    const items = queueData || [];
    startIndex = items.findIndex((item) => item.id.toString() === id_now_playing);

    const filteredQueue = startIndex !== -1 ? items.slice(startIndex + 1) : items;

    return filteredQueue;
  }
  async function play(idx: string) {
    try {
      async function remove(idx: string) {
        const response = await fetch(`${BASE_URL}/playback/queue/remove-by-index`, {
          method: "POST",
          headers: {
            apitoken: API_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ index: parseInt(idx) }),
        });

        const json = await response.json();

      if (idx != "0") {
        songs.forEach((s) => {
          if (s.index_queue < idx) {
            remove(s.index_queue).then(() => {
              if (parseInt(s.index_queue) == parseInt(idx) - 1) {
                fetch(`${BASE_URL}/playback/next`, {
                  method: "POST",
                  headers: {
                    apitoken: preferences.token,
                  },
                }).then(() => {
                  setSongs((prevSongs) => {
                    return prevSongs
                      .filter((song) => song.index_queue > idx)
                      .map((s, idx) => ({
                        id: s.id,
                        name: s.name,
                        artist: s.artist,
                        url: s.url,
                        artwork: s.artwork,
                        index_queue: idx.toString(),
                        album: s.album,
                        genre: s.genre,
                        duration: s.duration,
                        release_date: s.release_date,
                      }));
                  });
                });
              }
            });
          }
        });
      } else {
        fetch(`${BASE_URL}/playback/next`, {
          method: "POST",
          headers: {
            apitoken: preferences.token,
          },
        }).then(() => {
          setSongs((prevSongs) => {
            return prevSongs
              .filter((song) => song.index_queue > idx)
              .map((s, idx) => ({
                id: s.id,
                name: s.name,
                artist: s.artist,
                url: s.url,
                artwork: s.artwork,
                index_queue: idx.toString(),
                album: s.album,
                genre: s.genre,
                duration: s.duration,
                release_date: s.release_date,
              }));
          });
        });
      }

      await showToast({ style: Toast.Style.Success, title: "Playback Started" });
    } catch (e) {
      console.error(e);
      await showToast({ style: Toast.Style.Failure, title: "Could not send play command" });
    }
  }

  async function pop(idx: string) {
    if (idx != "0") {
      try {
        const response = await fetch(`${BASE_URL}/playback/queue/remove-by-index`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ index: parseInt(idx) }),
        });

        if (!response.ok) throw new Error("Cider Connection Error");

        setSongs((prevSongs) => {
          return prevSongs
            .filter((song) => song.index_queue !== idx)
            .map((s, idx) => ({
              id: s.id,
              name: s.name,
              artist: s.artist,
              url: s.url,
              artwork: s.artwork,
              index_queue: idx.toString(),
              album: s.album,
              genre: s.genre,
              duration: s.duration,
              release_date: s.release_date,
            }));
        });

        await showToast({ style: Toast.Style.Success, title: "Item removed" });
      } catch (e) {
        await showToast({ style: Toast.Style.Failure, title: "Could not remove item" });
        console.log(e);
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Can't remove the item that you are curentrly listening to",
      });
    }
  }

  async function clear() {
    const response = await fetch(`${BASE_URL}/playback/queue/clear-queue`, {
      method: "POST",
      headers: {
        apitoken: API_TOKEN,
      },
    });

    setSongs([]);

    if (response.ok) {
      await showToast({ style: Toast.Style.Success, title: "Item removed" });
    } else {
      await showToast({ style: Toast.Style.Failure, title: "Could not remove item" });
    }
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={true}
      isLoading={isLoading}
      filtering={true}
    >
      {songs.map((song) => (
        <List.Item
          key={song.id}
          title={song.name}
          subtitle={song.artist}
          keywords={[song.name, song.artist]}
          icon={{ source: song.artwork, mask: Image.Mask.RoundedRectangle }}
          detail={
            <List.Item.Detail
              markdown={`![Illustration](${song.artwork})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Index" text={song.index_queue} />
                  <List.Item.Detail.Metadata.Label title="Name" text={song.name} />
                  <List.Item.Detail.Metadata.Label title="Artist" text={song.artist} />
                  <List.Item.Detail.Metadata.Label title="Album" text={song.album} />
                  <List.Item.Detail.Metadata.TagList title="Genre">
                    {song.genre.map((genre: string, index: number) => (
                      <List.Item.Detail.Metadata.TagList.Item key={`${song.id}-genre-${index}`} text={genre} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Duration" text={song.duration} />
                  <List.Item.Detail.Metadata.Label title="Release Date" text={song.release_date} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Play in Cider" icon={Icon.Play} onAction={() => play(song.index_queue)} />
              <Action.OpenInBrowser title="Open in Apple Music" url={song.url} />
              <Action
                title="Remove from Queue"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                icon={Icon.Trash}
                onAction={() => pop(song.index_queue)}
              />
              <Action
                title="Clear Queue"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
                icon={Icon.Xmark}
                onAction={() => clear()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
