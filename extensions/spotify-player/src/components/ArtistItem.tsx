import { Image } from "@raycast/api";
import { ListOrGridItem } from "./ListOrGridItem";
import { ArtistsActionPanel } from "./ArtistsActionPanel";

export function ArtistItem({ artist, type }: { artist: SpotifyApi.ArtistObjectFull; type: "grid" | "list" }) {
  const icon: Image.ImageLike = {
    source: artist.images[0]?.url ?? "",
    mask: type === "list" ? Image.Mask.Circle : undefined,
  };

  const title = `${artist.name}`;

  return (
    <ListOrGridItem
      type={type}
      title={title}
      content={icon}
      icon={icon}
      actions={<ArtistsActionPanel title={title} artist={artist} />}
    />
  );
}
