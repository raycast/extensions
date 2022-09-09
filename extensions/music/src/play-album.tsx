import { Grid, List, Action, ActionPanel, Icon, closeMainWindow } from "@raycast/api";
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
import { play as playAlbum, shuffle as shuffleAlbum, show as showAlbum } from "./util/scripts/albums";
import { useState, useEffect } from "react";
import { Tracks } from "./tracks";
import { Track, Album } from "./util/models";
import { getAllTracks } from "./util/scripts/track";

export default function PlayLibraryAlbum() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>("");
  const setSearchTerm = (term: string) => setSearch(term.toLowerCase().trim());

  const [genre, setGenre] = useState<string>("all");

  useEffect(() => {
    const getTracks = async () => {
      setTracks(await getAllTracks());
      setIsLoading(false);
    };
    getTracks();
  }, []);

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
          await playAlbum(album);
          await closeMainWindow();
        }}
      />
      <Action
        title="Shuffle Album"
        icon={Icon.Shuffle}
        onAction={async () => {
          await shuffleAlbum(album);
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
          icon={{
            source: {
              light: "../assets/music-light.svg",
              dark: "../assets/music-dark.svg",
            },
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={async () => {
            await showAlbum(album);
            await closeMainWindow();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
