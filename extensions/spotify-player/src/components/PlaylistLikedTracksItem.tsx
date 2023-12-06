import { Image, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMe } from "../hooks/useMe";
import { ListOrGridItem } from "./ListOrGridItem";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { LikedTracksList } from "./LikedTracksList";
import { useYourLibrary } from "../hooks/useYourLibrary";

type PlaylistLikedTracksItemProps = {
  type: "grid" | "list";
};

export default function PlaylistLikedTracksItem({ type }: PlaylistLikedTracksItemProps) {
  const { meData } = useMe();
  const library = useYourLibrary();
  const { data: counts } = useCachedPromise(() => library.counts());

  const title = "Liked Songs";
  const icon: Image.ImageLike = { source: "https://misc.scdn.co/liked-songs/liked-songs-64.png" };
  const uri = `spotify:user:${meData?.id}:collection`;

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      content={icon}
      accessories={[{ text: `${counts?.tracks ?? "..."} songs` }]}
      actions={
        <ActionPanel>
          {meData?.id && <PlayAction playingContext={uri} />}
          {meData?.id && (
            <Action.Push
              title="Show Songs"
              icon={{ source: Icon.AppWindowList }}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "a" },
                Windows: { modifiers: ["ctrl", "shift"], key: "a" },
              }}
              target={<LikedTracksList />}
            />
          )}
          <FooterAction url={"https://open.spotify.com/collection/tracks"} uri={uri} title={title} />
        </ActionPanel>
      }
    />
  );
}
