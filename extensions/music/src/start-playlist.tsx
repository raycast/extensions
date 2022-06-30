import { Grid, List, Action, ActionPanel, closeMainWindow, showToast, Toast, useNavigation } from "@raycast/api";
import {
  ListOrGrid,
  ListOrGridDropdown,
  ListOrGridDropdownItem,
  ListOrGridSection,
  getViewLayout,
  getMaxNumberOfResults,
  getGridItemSize,
} from "./util/listorgrid";
import { getArtworkByIds } from "./util/scripts/playlists";
import { flow, pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";
import { Playlist } from "./util/models";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";
import * as A from "fp-ts/ReadonlyNonEmptyArray";
import { displayDuration } from "./util/utils";

enum PlaylistKind {
  ALL = "all",
  USER = "user",
  SUBSCRIPTION = "subscription",
}

type PlaylistSections = Readonly<Record<string, A.ReadonlyNonEmptyArray<Playlist>>>;

const kindToString = (kind: PlaylistKind) => {
  switch (kind) {
    case PlaylistKind.SUBSCRIPTION:
      return "Apple Music";
    case PlaylistKind.USER:
      return "Your Library";
    default:
      return kind;
  }
};

export default function PlaySelected() {
  const [playlistKind, setPlaylistKind] = useState<PlaylistKind>(PlaylistKind.ALL);
  const [playlists, setPlaylists] = useState<PlaylistSections | null>(null);
  const [artworks, setArtworks] = useState<any>(null);
  const { pop } = useNavigation();
  const layout = getViewLayout();
  const numResults = getMaxNumberOfResults();
  const gridItemSize = getGridItemSize();

  useEffect(() => {
    pipe(
      playlistKind,
      music.playlists.getPlaylists,
      TE.mapLeft((e) => {
        console.error(e);
        showToast(Toast.Style.Failure, "Could not get your playlists");
      }),
      TE.map(
        flow(
          parseResult<Playlist>(),
          (data) => {
            data = data.filter((playlist) => playlist.name !== "Library" && playlist.name !== "Music");
            return A.groupBy<Playlist>((playlist) => playlist.kind?.split(" ")?.[0] ?? "Other")(data);
          },
          setPlaylists
        )
      )
    )();
  }, [playlistKind]);

  useEffect(() => {
    const getArtworks = async () => {
      if (playlists) {
        const ids = Object.entries(playlists)
          .map(([_, data]) => data.map((playlist) => playlist.id))
          .reduce((acc, curr) => acc.concat(curr), [])
          .slice(0, numResults);
        if (ids !== null) {
          if (ids.length === 0) {
            setArtworks({});
            return;
          }
          try {
            const artworks = await getArtworkByIds(ids);
            setArtworks(artworks);
          } catch {
            showToast(Toast.Style.Failure, "Error: Failed to get track artworks");
          }
        } else setArtworks(null);
      }
    };
    getArtworks();
    return () => {
      setArtworks(null);
    };
  }, [playlists]);

  return (
    <ListOrGrid
      itemSize={gridItemSize}
      isLoading={artworks === null}
      searchBarPlaceholder="Search A Playlist"
      searchBarAccessory={
        <ListOrGridDropdown
          tooltip="Playlist Kind"
          value={playlistKind}
          defaultValue={PlaylistKind.ALL}
          onChange={(s) => setPlaylistKind(s as PlaylistKind)}
        >
          <ListOrGridDropdownItem title="All Playlists" value={PlaylistKind.ALL} />
          <ListOrGridDropdownItem title="User Playlists" value={PlaylistKind.USER} />
          <ListOrGridDropdownItem title="Apple Music" value={PlaylistKind.SUBSCRIPTION} />
        </ListOrGridDropdown>
      }
    >
      {artworks &&
        Object.entries(playlists ?? {}).map(([section, data]) => (
          <ListOrGridSection title={kindToString(section as PlaylistKind)} key={section}>
            {data
              .filter((playlist) => playlist.name !== "Music")
              .map((playlist) =>
                layout === "grid" ? (
                  <Grid.Item
                    key={playlist.id}
                    title={playlist.name}
                    content={artworks[playlist.id] || ""}
                    subtitle={displayDuration(parseInt(playlist.duration))}
                    actions={<Actions playlist={playlist} pop={pop} />}
                  />
                ) : (
                  <List.Item
                    key={playlist.id}
                    title={playlist.name}
                    icon={artworks[playlist.id] || ""}
                    accessories={[{ text: displayDuration(parseInt(playlist.duration)) }]}
                    actions={<Actions playlist={playlist} pop={pop} />}
                  />
                )
              )}
          </ListOrGridSection>
        ))}
    </ListOrGrid>
  );
}

interface ActionsProps {
  playlist: Playlist;
  pop(): void;
}

function Actions({ playlist: { name, id }, pop }: ActionsProps) {
  const handleSubmit = (shuffle?: boolean) => async () => {
    await pipe(
      id,
      music.playlists.playById(shuffle),
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this playlist"))
    )();

    pop();
  };

  return (
    <ActionPanel>
      <Action title="Start Playlist" onAction={handleSubmit(false)} />
      <Action title="Shuffle Playlist" onAction={handleSubmit(true)} />
    </ActionPanel>
  );
}
