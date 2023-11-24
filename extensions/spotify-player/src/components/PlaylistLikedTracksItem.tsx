import { Image, ActionPanel } from "@raycast/api";
import { useMe } from "../hooks/useMe";
import { ListOrGridItem } from "./ListOrGridItem";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";

type PlaylistLikedTracksItemProps = {
  type: "grid" | "list";
};

export default function PlaylistLikedTracksItem({ type }: PlaylistLikedTracksItemProps) {
  const { meData } = useMe();
  const title = "Liked Songs";
  const icon: Image.ImageLike = { source: "https://misc.scdn.co/liked-songs/liked-songs-64.png" };
  const uri = `spotify:user:${meData?.id}:collection`;

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      content={icon}
      actions={
        <ActionPanel>
          {meData?.id && <PlayAction playingContext={`spotify:user:${uri}:collection`} />}
          <FooterAction url={"https://open.spotify.com/collection/tracks"} uri={uri} title={title} />
        </ActionPanel>
      }
    />
  );
}
