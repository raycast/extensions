import { Image, Icon } from "@raycast/api";
import { ArtistObject } from "../helpers/spotify.api";
import { ListOrGridItem } from "./ListOrGridItem";
import { ArtistActionPanel } from "./ArtistActionPanel";

type ArtistItemProps = {
  type: "grid" | "list";
  artist: ArtistObject;
  onRefresh?: () => void;
};

export default function ArtistItem({ type, artist, onRefresh }: ArtistItemProps) {
  const title = artist.name || "Unknown Artist";
  const icon: Image.ImageLike = artist.images?.[0]?.url
    ? {
        source: artist.images[0].url,
      }
    : { source: Icon.Person };

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      content={icon}
      accessories={[{ text: `${artist.followers?.total || 0} followers` }]}
      actions={<ArtistActionPanel title={title} artist={artist} onRefresh={onRefresh} />}
    />
  );
}
