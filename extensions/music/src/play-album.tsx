import { Grid, List, Action, ActionPanel, Icon, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";

import { Tracks } from "./tracks";
import {
  ListOrGrid,
  ListOrGridDropdown,
  ListOrGridDropdownSection,
  ListOrGridDropdownItem,
  gridItemSize,
  mainLayout,
  LayoutType,
  albumLayout,
} from "./util/list-or-grid";
import { Album } from "./util/models";
import * as music from "./util/scripts";
import { Icons } from "./util/utils";

export default function PlayAlbum() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>("");
  const setSearchTerm = (term: string) => setSearch(term.toLowerCase().trim());

  const [genre, setGenre] = useState<string>("all");

  useEffect(() => {
    const getAlbums = async () => {
      const tracks = await music.track.getAllTracks();
      const albums: Album[] = [];
      for (const track of tracks) {
        const id = `${track.album}-${track.albumArtist}`;
        const album = albums.find((a) => a.id === id);
        if (album) {
          album.tracks.push(track);
        } else {
          albums.push({
            id: id,
            name: track.album,
            artist: track.albumArtist,
            artwork: track.artwork,
            genre: track.genre,
            tracks: [track],
          });
        }
      }
      setAlbums(albums);
      setIsLoading(false);
    };
    getAlbums();
  }, []);

  return (
    <ListOrGrid
      isLoading={isLoading}
      searchBarPlaceholder="Search an album by title or artist"
      onSearchTextChange={setSearchTerm}
      itemSize={gridItemSize}
      searchBarAccessory={
        <ListOrGridDropdown tooltip="Genres" onChange={setGenre}>
          <ListOrGridDropdownItem value="all" title="All Genres" />
          <ListOrGridDropdownSection>
            {Array.from(new Set(albums.map((track) => track.genre)))
              .sort((a, b) => a.localeCompare(b))
              .map((genre: string, index: number) => (
                <ListOrGridDropdownItem key={index} title={genre} value={genre} />
              ))}
          </ListOrGridDropdownSection>
        </ListOrGridDropdown>
      }
    >
      {albums
        .filter((album: Album) => genre === "all" || album.genre === genre)
        .filter((album: Album) => {
          return album.name.toLowerCase().includes(search) || album.artist.toLowerCase().includes(search);
        })
        .sort((a: Album, b: Album) => a.artist.localeCompare(b.artist) || a.name.localeCompare(b.name))
        .map((album) =>
          mainLayout === LayoutType.Grid ? (
            <Grid.Item
              key={album.id}
              id={album.id}
              title={album.name}
              subtitle={album.artist}
              content={album.artwork || "../assets/no-track.png"}
              actions={<Actions album={album} />}
            />
          ) : (
            <List.Item
              key={album.id}
              id={album.id}
              title={album.name}
              accessories={[{ text: album.artist }]}
              icon={album.artwork || "../assets/no-track.png"}
              actions={<Actions album={album} />}
            />
          )
        )}
    </ListOrGrid>
  );
}

function Actions({ album }: { album: Album }) {
  return (
    <ActionPanel>
      <Action
        title="Play Album"
        icon={Icon.Play}
        onAction={async () => {
          await music.albums.play(album);
          await closeMainWindow();
        }}
      />
      <Action
        title="Shuffle Album"
        icon={Icon.Shuffle}
        onAction={async () => {
          await music.albums.shuffle(album);
          await closeMainWindow();
        }}
      />
      <ActionPanel.Section>
        <Action.Push
          title="Show Tracks"
          icon={Icon.BulletPoints}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          target={<Tracks isLoading={false} tracks={album.tracks} overrideLayout={albumLayout} dropdown={false} />}
        />
        <Action
          title="Show in Apple Music"
          icon={Icons.Music}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={async () => {
            await music.albums.show(album);
            await closeMainWindow();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
