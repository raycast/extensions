import { Image, Icon } from "@raycast/api";
import { SimplifiedShowObject } from "../helpers/spotify.api";
import { ListOrGridItem } from "./ListOrGridItem";
import { ShowActionPanel } from "./ShowActionPanel";

type ShowItemProps = {
  type: "grid" | "list";
  show: SimplifiedShowObject;
  onRefresh?: () => void;
};

export function ShowItem({ type, show, onRefresh }: ShowItemProps) {
  const title = show.name || "Untitled Show";
  const subtitle = show.publisher;
  const icon: Image.ImageLike = show.images?.[0]?.url
    ? {
        source: show.images[0].url,
      }
    : { source: Icon.Microphone };

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      subtitle={subtitle}
      content={icon}
      accessories={[{ text: `${show.total_episodes || 0} episodes` }]}
      actions={<ShowActionPanel show={show} onRefresh={onRefresh} />}
    />
  );
}
