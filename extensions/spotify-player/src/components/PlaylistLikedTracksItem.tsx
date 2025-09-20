import { Image, ActionPanel, Action, Icon } from "@raycast/api";
import { useMe } from "../hooks/useMe";
import { ListOrGridItem } from "./ListOrGridItem";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { TracksList } from "./TracksList";
import { useYourLibrary } from "../hooks/useYourLibrary";

type PlaylistLikedTracksItemProps = {
  type: "grid" | "list";
};

export default function PlaylistLikedTracksItem({ type }: PlaylistLikedTracksItemProps) {
  const { meData } = useMe();
  const title = "Liked Songs";
  const icon: Image.ImageLike = { source: "https://misc.scdn.co/liked-songs/liked-songs-64.png" };
  const uri = `spotify:user:${meData?.id}:collection`;
  const { myLibraryData } = useYourLibrary({
    keepPreviousData: true,
  });

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={title}
      content={icon}
      accessories={[{ text: `${myLibraryData?.tracks?.total} songs` }]}
      actions={
        <ActionPanel>
          {meData?.id && <PlayAction playingContext={uri} />}
          {meData?.id && (
            <Action.Push
              title="Show Songs"
              icon={{ source: Icon.AppWindowList }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              target={<TracksList tracks={myLibraryData.tracks?.items} />}
            />
          )}
          <FooterAction url={"https://open.spotify.com/collection/tracks"} uri={uri} title={title} />
        </ActionPanel>
      }
    />
  );
}
