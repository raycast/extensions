import { Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as A from "fp-ts/ReadonlyNonEmptyArray";
import { ReactElement } from "react";

import { Playlist, PlaylistKind } from "../util/models";
import { parseResult } from "../util/parser";
import { getPlaylists } from "../util/scripts/playlists";

type PlaylistListProps = {
  kind: PlaylistKind;
  onKindChange?: (kind: PlaylistKind) => void;
  renderActions: (playlist: Playlist) => ReactElement;
  getAccessories?: (playlist: Playlist) => List.Item.Accessory[];
};

const sectionTitle = (kind: string) => {
  if (kind === PlaylistKind.USER) return "Your Library";
  if (kind === PlaylistKind.SUBSCRIPTION) return "Apple Music";
  return kind;
};

const playlistAccessories = (playlist: Playlist): List.Item.Accessory[] => [
  { icon: Icon.Music, text: playlist.count },
  { icon: Icon.Clock, text: `${Math.floor(Number(playlist.duration) / 60)} min` },
];

export function PlaylistList({
  kind,
  onKindChange,
  renderActions,
  getAccessories = playlistAccessories,
}: PlaylistListProps) {
  const { data: sections = {}, isLoading } = useCachedPromise(
    async (playlistKind: PlaylistKind) => {
      const result = await getPlaylists(playlistKind)();
      if (result._tag === "Left") throw result.left;
      return A.groupBy<Playlist>((playlist) => playlist.kind?.split(" ")[0] ?? "Other")(
        parseResult<Playlist>()(result.right),
      );
    },
    [kind],
    {
      onError: async (error) => {
        console.error(error);
        await showToast(Toast.Style.Failure, "Could not get your playlists");
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search A Playlist"
      searchBarAccessory={
        onKindChange ? (
          <List.Dropdown
            tooltip="Playlist Kind"
            value={kind}
            onChange={(value) => {
              if (value === PlaylistKind.ALL || value === PlaylistKind.USER || value === PlaylistKind.SUBSCRIPTION) {
                onKindChange(value);
              }
            }}
          >
            <List.Dropdown.Item title="All" value={PlaylistKind.ALL} />
            <List.Dropdown.Item title="User" value={PlaylistKind.USER} />
            <List.Dropdown.Item title="Apple Music" value={PlaylistKind.SUBSCRIPTION} />
          </List.Dropdown>
        ) : undefined
      }
    >
      {Object.entries(sections)
        .filter(([section]) => section !== "library")
        .map(([section, playlists]) => (
          <List.Section title={sectionTitle(section)} key={section}>
            {playlists.map((playlist) => (
              <List.Item
                key={playlist.id}
                title={playlist.name || "Unknown Playlist"}
                accessories={getAccessories(playlist)}
                icon="icon.png"
                actions={renderActions(playlist)}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
