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
}

interface Album {
  id: string;
  name: string;
  artist: string;
  url: string;
  artwork: string;
}

interface SongList {
  id: string;
  type: string;
  href: string;
  attributes: {
    albumName: string;
    artistName: string;
    artwork: {
      bgColor: string;
      hasP3: boolean;
      height: number;
      textColor1: string;
      textColor2: string;
      textColor3: string;
      textColor4: string;
      url: string;
      width: number;
    };
    audioLocale: string;
    audioTraits: Array<string>;
    discNumber: number;
    durationInMillis: number;
    genreNames: Array<string>;
    hasLyrics: boolean;
    hasTimeSyncedLyrics: boolean;
    isAppleDigitalMaster: boolean;
    isMasteredForItunes: boolean;
    isVocalAttenuationAllowed: boolean;
    isrc: string;
    name: string;
    playParams: { id: number; kind: string };
    previews: Array<string>;
    releaseDate: string;
    trackNumber: number;
    url: string;
  };
}

interface AlbumList {
  id: string;
  type: string;
  href: string;
  attributes: {
    artistName: string;
    artwork: {
      bgColor: string;
      hasP3: boolean;
      height: number;
      textColor1: string;
      textColor2: string;
      textColor3: string;
      textColor4: string;
      url: string;
      width: number;
    };
    audioTraits: Array<string>;
    copyright: string;
    genreNames: Array<string>;
    isCompilation: boolean;
    isComplete: boolean;
    isMasteredForItunes: boolean;
    isPrerelease: boolean;
    isSingle: boolean;
    name: string;
    playParams: { id: number; kind: string };
    recordLabel: string;
    releaseDate: string;
    trackNumber: number;
    upc: string;
    url: string;
  };
}

interface SongsJsonType {
  data: {
    results: {
      songs: {
        href: "/v1/catalog/us/search?limit=5&term=hsy&types=songs";
        next: "/v1/catalog/us/search?offset=5&term=hsy&types=songs";
        data: Array<SongList>;
      };
    };
    meta: {
      results: { order: Array<string>; rawOrder: Array<string> };
      metrics: { dataSetId: "e7e1d843-d4ec-437d-9c23-27949335835d" };
    };
  };
}

interface AlbumsJsonType {
  data: {
    results: {
      albums: {
        href: "/v1/catalog/us/search?limit=5&term=hsy&types=songs";
        next: "/v1/catalog/us/search?offset=5&term=hsy&types=songs";
        data: Array<AlbumList>;
      };
    };
    meta: {
      results: { order: Array<string>; rawOrder: Array<string> };
      metrics: { dataSetId: "e7e1d843-d4ec-437d-9c23-27949335835d" };
    };
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);

  const headers = {
    apitoken: API_TOKEN,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    if (searchText.length < 2) {
      setSongs([]);
      setAlbums([]);
      return;
    }

    async function search() {
      setIsLoading(true);
      try {
        const searchPath_songs = `/v1/catalog/us/search?term=${searchText.trim().replace(/\s+/g, "+")}&types=songs&limit=5`;
        const searchPath_albums = `/v1/catalog/us/search?term=${searchText.trim().replace(/\s+/g, "+")}&types=albums&limit=5`;

        if (filter == "3" || filter == "1") {
          // Use the GLOBAL fetch here
          const response_songs = await fetch(`${BASE_URL}/amapi/run-v3`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ path: searchPath_songs }),
          });

          if (!response_songs.ok) throw new Error("Cider Connection Error");

          const json_songs = (await response_songs.json()) as SongsJsonType;
          const results_songs = json_songs.data?.results?.songs?.data || [];

          setSongs(
            results_songs.map((s: SongList) => ({
              id: s.id,
              name: s.attributes.name,
              artist: s.attributes.artistName,
              url: s.attributes.url,
              artwork: s.attributes.artwork?.url.replace("{w}x{h}", "100x100") || Icon.Music,
            })),
          );
        }

        if (filter == "2" || filter == "1") {
          // Use the GLOBAL fetch here
          const response_albums = await fetch(`${BASE_URL}/amapi/run-v3`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ path: searchPath_albums }),
          });

          if (!response_albums.ok) throw new Error("Cider Connection Error");

          const json_albums = (await response_albums.json()) as AlbumsJsonType;
          const results_albums = json_albums.data?.results?.albums?.data || [];

          setAlbums(
            results_albums.map((s: AlbumList) => ({
              id: s.id,
              name: s.attributes.name,
              artist: s.attributes.artistName,
              url: s.attributes.url,
              artwork: s.attributes.artwork?.url.replace("{w}x{h}", "100x100") || Icon.Music,
            })),
          );
        }
      } catch (error) {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Cider Connection Failed",
          message: "Is Cider running with RPC enabled?",
        });
      } finally {
        setIsLoading(false);
      }
    }

    search();
  }, [searchText, filter]);

  async function play(id: string, type: string) {
    try {
      await fetch(`${BASE_URL}/playback/play-item`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ id: id, type: type }),
      });
      await showToast({ style: Toast.Style.Success, title: "Playback Started" });
    } catch (e) {
      console.error(e);
      await showToast({ style: Toast.Style.Failure, title: "Could not send play command" });
    }
  }

  // ... (keep your imports and logic the same until the return statement)

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search songs to play on Cider..."
      searchBarAccessory={
        <List.Dropdown
          tooltip=""
          onChange={(newValue) => {
            setFilter(newValue);
            if (newValue == "2") {
              setSongs([]);
            }
            if (newValue == "3") {
              setAlbums([]);
            }
          }}
        >
          <List.Dropdown.Item title="All" value="1"></List.Dropdown.Item>
          <List.Dropdown.Item title="Albums" value="2"></List.Dropdown.Item>
          <List.Dropdown.Item title="Songs" value="3"></List.Dropdown.Item>
        </List.Dropdown>
      }
      throttle={true}
    >
      <List.EmptyView title="Start typing to find music" icon={Icon.Music} />

      <List.Section title="Songs">
        {songs.map((song) => (
          <List.Item
            key={song.id}
            title={song.name}
            subtitle={song.artist}
            icon={{ source: song.artwork, mask: Image.Mask.RoundedRectangle }}
            actions={
              <ActionPanel>
                <Action title="Play in Cider" icon={Icon.Play} onAction={() => play(song.id, "songs")} />
                <Action.OpenInBrowser title="Open in Apple Music" url={song.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Albums">
        {albums.map((album) => (
          <List.Item
            key={album.id}
            title={album.name}
            subtitle={album.artist}
            icon={{ source: album.artwork, mask: Image.Mask.RoundedRectangle }}
            actions={
              <ActionPanel>
                <Action title="Play in Cider" icon={Icon.Play} onAction={() => play(album.id, "albums")} />
                <Action.OpenInBrowser title="Open in Apple Music" url={album.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
