import { Icon, Image } from "@raycast/api";
import { ArtistObject } from "../helpers/spotify.api";
import { ListOrGridItem } from "./ListOrGridItem";
import { ArtistActionPanel } from "./ArtistActionPanel";

type ArtistItemProps = {
  type: "grid" | "list";
  artist: ArtistObject;
};

export function ArtistItem({ type, artist }: ArtistItemProps) {
  const icon: Image.ImageLike = {
    source: artist?.images?.[0]?.url ?? Icon.Dot,
    mask: Image.Mask.Circle,
  };

  const title = `${artist.name}`;

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      content={icon}
      actions={<ArtistActionPanel title={title} artist={artist} />}
    />
  );
}
