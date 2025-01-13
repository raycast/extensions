import { Image, ActionPanel, Action, Icon } from "@raycast/api";
import { useMe } from "../hooks/useMe";
import { ListOrGridItem } from "./ListOrGridItem";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { TracksList } from "./TracksList";
import { MinimalTrack } from "../api/getMySavedTracks";
import { RefreshAction } from "./RefreshAction";
import { memo, useMemo } from "react";

// Constants
const LIKED_SONGS_ICON = "https://misc.scdn.co/liked-songs/liked-songs-64.png";
const LIKED_SONGS_TITLE = "Liked Songs";
const LIKED_SONGS_URL = "https://open.spotify.com/collection/tracks";

// Types
type PlaylistLikedTracksItemProps = {
  type: "grid" | "list";
  tracks?: {
    items: MinimalTrack[];
    total: number;
  };
  onRefresh?: () => void;
};

// Memoized action panel component
const LikedTracksActions = memo(
  ({ uri, tracks, onRefresh }: { uri: string; tracks?: MinimalTrack[]; onRefresh?: () => void }) => (
    <ActionPanel>
      <PlayAction playingContext={uri} />
      <Action.Push
        title="Show Songs"
        icon={{ source: Icon.AppWindowList }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksList tracks={tracks} />}
      />
      {onRefresh && <RefreshAction onRefresh={onRefresh} />}
      <FooterAction url={LIKED_SONGS_URL} uri={uri} title={LIKED_SONGS_TITLE} />
    </ActionPanel>
  ),
);

export default function PlaylistLikedTracksItem({ type, tracks, onRefresh }: PlaylistLikedTracksItemProps) {
  const { meData } = useMe();
  const icon: Image.ImageLike = { source: LIKED_SONGS_ICON };

  // Memoize URI to prevent unnecessary re-renders
  const uri = useMemo(() => (meData?.id ? `spotify:user:${meData.id}:collection` : ""), [meData?.id]);

  if (!meData?.id) return null;

  return (
    <ListOrGridItem
      type={type}
      icon={icon}
      title={LIKED_SONGS_TITLE}
      content={icon}
      accessories={[{ text: `${tracks?.total || 0} songs` }]}
      actions={<LikedTracksActions uri={uri} tracks={tracks?.items} onRefresh={onRefresh} />}
    />
  );
}
