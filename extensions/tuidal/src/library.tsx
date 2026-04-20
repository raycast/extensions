import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  api,
  artistNames,
  formatDuration,
  playTrack,
  qualityIcon,
} from "./api";
import type { FavAlbum, Mix, Playlist, Track } from "./types";

// ── Shared track list ─────────────────────────────────────────────────────────

function TrackList({
  tracks,
  title,
  isLoading = false,
}: {
  tracks: Track[];
  title: string;
  isLoading?: boolean;
}) {
  async function play(track: Track) {
    try {
      await playTrack(track);
      await showToast({
        style: Toast.Style.Success,
        title: `▶ ${track.title}`,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tuidal not running",
      });
    }
  }

  return (
    <List navigationTitle={title} isLoading={isLoading}>
      {tracks.map((track, i) => (
        <List.Item
          key={`${track.id}-${i}`}
          icon={qualityIcon(track.audio_quality)}
          title={track.title}
          subtitle={artistNames(track.artists)}
          accessories={[{ text: formatDuration(track.duration) }]}
          actions={
            <ActionPanel>
              <Action
                title="Play"
                icon={Icon.Play}
                onAction={() => play(track)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ── Lazy-loading wrappers ─────────────────────────────────────────────────────

function PlaylistDetail({ uuid, title }: { uuid: string; title: string }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .playlistTracks(uuid)
      .then(setTracks)
      .catch(() =>
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load playlist",
        }),
      )
      .finally(() => setLoading(false));
  }, [uuid]);
  return <TrackList tracks={tracks} title={title} isLoading={loading} />;
}

function MixDetail({ id, title }: { id: string; title: string }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .mixTracks(id)
      .then(setTracks)
      .catch(() =>
        showToast({ style: Toast.Style.Failure, title: "Failed to load mix" }),
      )
      .finally(() => setLoading(false));
  }, [id]);
  return <TrackList tracks={tracks} title={title} isLoading={loading} />;
}

function AlbumDetail({ id, title }: { id: number; title: string }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .albumTracks(id)
      .then(setTracks)
      .catch(() =>
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load album",
        }),
      )
      .finally(() => setLoading(false));
  }, [id]);
  return <TrackList tracks={tracks} title={title} isLoading={loading} />;
}

// ── Favorite albums list ──────────────────────────────────────────────────────

function FavAlbumList({
  albums,
  isLoading = false,
}: {
  albums: FavAlbum[];
  isLoading?: boolean;
}) {
  const { push } = useNavigation();
  return (
    <List navigationTitle="Favorite Albums" isLoading={isLoading}>
      {albums.map((album) => (
        <List.Item
          key={album.id}
          icon={Icon.Music}
          title={album.title}
          subtitle={artistNames(album.artists)}
          accessories={[{ text: `${album.numberOfTracks} tracks` }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Album"
                icon={Icon.ChevronRight}
                onAction={() =>
                  push(<AlbumDetail id={album.id} title={album.title} />)
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ── Favorites track list ──────────────────────────────────────────────────────

function FavoritesDetail() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .favorites()
      .then(setTracks)
      .catch(() =>
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load favorites",
        }),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <TrackList tracks={tracks} title="Favorite Tracks" isLoading={loading} />
  );
}

function FavAlbumsDetail() {
  const [albums, setAlbums] = useState<FavAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .favoriteAlbums()
      .then(setAlbums)
      .catch(() =>
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load albums",
        }),
      )
      .finally(() => setLoading(false));
  }, []);
  return <FavAlbumList albums={albums} isLoading={loading} />;
}

// ── Main library view ─────────────────────────────────────────────────────────

export default function Library() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    api
      .library()
      .then(({ playlists, mixes }) => {
        setPlaylists(playlists);
        setMixes(mixes);
      })
      .catch(() =>
        showToast({ style: Toast.Style.Failure, title: "Tuidal not running" }),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <List isLoading={loading} navigationTitle="Your Library">
      <List.Section title="Collection">
        <List.Item
          icon={Icon.Heart}
          title="Favorite Tracks"
          actions={
            <ActionPanel>
              <Action
                title="Open"
                icon={Icon.ChevronRight}
                onAction={() => push(<FavoritesDetail />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Music}
          title="Favorite Albums"
          actions={
            <ActionPanel>
              <Action
                title="Open"
                icon={Icon.ChevronRight}
                onAction={() => push(<FavAlbumsDetail />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Playlists (${playlists.length})`}>
        {playlists.map((pl) => (
          <List.Item
            key={pl.uuid}
            icon={Icon.List}
            title={pl.title}
            accessories={[{ text: `${pl.numberOfTracks} tracks` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Playlist"
                  icon={Icon.ChevronRight}
                  onAction={() =>
                    push(<PlaylistDetail uuid={pl.uuid} title={pl.title} />)
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={`Mixes (${mixes.length})`}>
        {mixes.map((mix) => (
          <List.Item
            key={mix.id}
            icon={Icon.Stars}
            title={mix.title}
            subtitle={mix.subTitle}
            actions={
              <ActionPanel>
                <Action
                  title="Open Mix"
                  icon={Icon.ChevronRight}
                  onAction={() =>
                    push(<MixDetail id={mix.id} title={mix.title} />)
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
