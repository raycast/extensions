import { Image, List } from "@raycast/api";
import _ from "lodash";
import { getAlbumTracks } from "../spotify/client";
import { AlbumsActionPanel } from "./AlbumsActionPanel";

export default function AlbumListItem(props: { album: SpotifyApi.AlbumObjectSimplified; showDetails: boolean }) {
  const { album, showDetails } = props;
  const icon: Image.ImageLike = {
    source: album.images[album.images.length - 1]?.url,
    mask: Image.Mask.Circle,
  };

  const title = album.name;
  const subtitle = showDetails ? `${album.artists.map((a) => a.name).join(", ")}` : undefined;
  return (
    <List.Item
      title={{ value: title, tooltip: title }}
      subtitle={subtitle}
      detail={<AlbumDetail album={album} />}
      accessories={[
        { text: album.release_date.substring(0, 4), tooltip: "Release Year" },
        showDetails ? { text: `${album.total_tracks.toString()} songs`, tooltip: "Number of Tracks" } : {},
      ]}
      icon={icon}
      actions={<AlbumsActionPanel album={album} />}
    />
  );
}

function AlbumDetail(props: { album: SpotifyApi.AlbumObjectSimplified }) {
  const { album } = props;
  const response = getAlbumTracks(album.id);
  const albums = response.result?.items;
  return <List.Item.Detail isLoading={response.isLoading} markdown={getAlbumDetailMarkdownContent(album, albums)} />;
}

const getAlbumDetailMarkdownContent = (
  album: SpotifyApi.AlbumObjectSimplified,
  tracks: SpotifyApi.TrackObjectSimplified[] | undefined
) => {
  let header = `# ${album.name}\n`;

  const albumCover = _(album.images).first()?.url;
  if (albumCover) {
    header += `![](${albumCover})\n\n`;
  }

  const albumsString = tracks
    ?.map((a) => {
      return `• ${a.name}\n`;
    })
    .join(" \n");
  const content = `## Tracks: \n ${albumsString ?? "Loading..."}`;
  return `${header}\n\n${content}`;
};
