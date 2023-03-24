import { Action, ActionPanel, Grid, LocalStorage, showToast } from "@raycast/api";
import { AppleMusicResource } from "../types";

function OpenInMusicAction({ kind, id, title = "Open in Apple Music" }: { kind: string; id: string; title?: string }) {
  return (
    <>
      <Action.OpenInBrowser url={`https://music.apple.com/${kind}/${id}`} title={title} />
      <Action.CopyToClipboard title="Copy Link" content={`https://music.apple.com/${kind}/${id}`} />
    </>
  );
}

export function Song({ song }: { song: AppleMusicResource }) {
  return (
    <Grid.Item
      content={{
        source: song.attributes.artwork?.url.replace("{w}", "600").replace("{h}", "600") || "",
      }}
      title={song.attributes.name}
      subtitle={song.attributes.artistName}
      actions={
        <ActionPanel>
          <OpenInMusicAction kind={"song"} id={song.id} />
        </ActionPanel>
      }
    />
  );
}

export function Album({ album }: { album: AppleMusicResource }) {
  return (
    <Grid.Item
      content={{
        source: album.attributes.artwork?.url.replace("{w}", "600").replace("{h}", "600") || "",
      }}
      title={album.attributes.name}
      subtitle={album.attributes.artistName}
      actions={
        <ActionPanel>
          <OpenInMusicAction kind={"album"} id={album.id} />
        </ActionPanel>
      }
    />
  );
}

export function Playlist({ playlist }: { playlist: AppleMusicResource }) {
  return (
    <Grid.Item
      content={{
        source: playlist.attributes.artwork?.url.replace("{w}", "600").replace("{h}", "600") || "",
      }}
      title={playlist.attributes.name}
      subtitle={playlist.attributes.curatorName}
      actions={
        <ActionPanel>
          <OpenInMusicAction kind={"playlist"} id={playlist.id} />
        </ActionPanel>
      }
    />
  );
}

export function Artist({ artist }: { artist: AppleMusicResource }) {
  return (
    <Grid.Item
      content={{
        source: artist.attributes.artwork?.url.replace("{w}", "600").replace("{h}", "600") || "",
      }}
      title={artist.attributes.name}
      actions={
        <ActionPanel>
          <OpenInMusicAction kind={"artist"} id={artist.id} />
        </ActionPanel>
      }
    />
  );
}

export function Station({ station }: { station: AppleMusicResource }) {
  return (
    <Grid.Item
      content={{
        source: station.attributes.artwork?.url.replace("{w}", "600").replace("{h}", "600") || "",
      }}
      title={station.attributes.name}
      actions={
        <ActionPanel>
          <OpenInMusicAction kind={"station"} id={station.id} title={"Play Station"} />
        </ActionPanel>
      }
    />
  );
}

export function Tile({ resource }: { resource: AppleMusicResource }) {
  switch (resource.type) {
    case "songs":
      return <Song song={resource} />;
    case "albums":
      return <Album album={resource} />;
    case "playlists":
      return <Playlist playlist={resource} />;
    case "artists":
      return <Artist artist={resource} />;
    case "stations":
      return <Station station={resource} />;
    default:
      return null;
  }
}
