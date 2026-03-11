import { ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues, Grid, LocalStorage } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";

const preferences = getPreferenceValues<{ token: string }>();
const BASE_URL = "http://localhost:10767/api/v1";
const STORAGE_KEY = "cider-library-cache";

interface Album {
  id: string;
  name: string;
  artist: string;
  artwork: string;
}

interface AlbumList {
  id: string;
  type: string;
  href: string;
  attributes: {
    artistName: string;
    artwork: {
      hasP3: boolean;
      height: number;
      url: string;
      width: number;
    };
    dateAdded: string;
    genreNames: Array<string>;
    name: string;
    playParams: { id: string; isLibrary: boolean; kind: string };
    releaseDate: string;
    trackCount: number;
  };
}

interface AlbumJson {
  data: {
    next: string;
    data: Array<AlbumList>;
  };
  meta: { total: number };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [library, setLibrary] = useState<Album[]>([]);

  const headers = {
    apitoken: preferences.token,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    async function init() {
      const cached = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (cached) {
        setLibrary(JSON.parse(cached));
        setIsLoading(false);
      }

      try {
        const freshData = await fetchLibrary();
        setLibrary(freshData);
        await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(freshData));
      } catch (error) {
        console.error(error);
        if (!cached) showToast({ style: Toast.Style.Failure, title: "Cider Connection Failed" });
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  async function fetchLibrary(): Promise<Album[]> {
    let allAlbums: AlbumList[] = [];
    let nextPath: string | null = "/v1/me/library/albums?limit=100";

    for (let i = 0; i < 3 && nextPath; i++) {
      const res = await fetch(`${BASE_URL}/amapi/run-v3`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ path: nextPath }),
      });
      const js = (await res.json()) as AlbumJson;
      allAlbums = [...allAlbums, ...(js.data?.data || [])];
      nextPath = js.data?.next || null;
      allAlbums.reverse();
    }

    return allAlbums.map((album) => {
      const attrs = album.attributes;
      return {
        id: attrs?.playParams?.id || album.id,
        name: attrs?.name || "Unknown Album",
        artist: attrs?.artistName || "Unknown Artist",
        artwork: attrs?.artwork?.url?.replace("{w}x{h}", "300x300") || Icon.Music,
      };
    });
  }

  const filteredAlbums = useMemo(() => {
    const query = searchText.toLowerCase();
    return library.filter((a) => a.name.toLowerCase().includes(query) || a.artist.toLowerCase().includes(query));
  }, [searchText, library]);

  async function play(id: string, name: string) {
    try {
      const type = id.startsWith("l.") ? "library-albums" : "albums";
      await fetch(`${BASE_URL}/playback/play-item`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ type: type, id: id }),
      });
      showToast({ style: Toast.Style.Success, title: `Playing ${name}` });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Playback Failed" });
    }
  }

  return (
    <Grid isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} columns={4} throttle={true}>
      {filteredAlbums.map((album) => (
        <Grid.Item
          key={album.id}
          title={album.name}
          subtitle={album.artist}
          content={album.artwork}
          actions={
            <ActionPanel>
              <Action title="Play Album" icon={Icon.Play} onAction={() => play(album.id, album.name)} />
              <Action.CopyToClipboard title="Copy Album Name" content={album.name} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
