import { Grid, List, Action, ActionPanel, closeMainWindow, showToast, Toast, Icon } from "@raycast/api";
import {
  ListOrGrid,
  gridItemSize,
  ListOrGridDropdown,
  ListOrGridDropdownItem,
  ListOrGridDropdownSection,
  LayoutType,
  mainLayout,
} from "./util/list-or-grid";
import { useState } from "react";
import { Track } from "./util/models";
import { TrackDetail } from "./track-detail";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as music from "./util/scripts";
import { MusicIcon } from "./util/utils";

interface TracksComponent {
  tracks: Track[];
  isLoading: boolean;
  overrideLayout?: LayoutType;
  dropdown: boolean;
}

export const Tracks = (props: TracksComponent): JSX.Element => {
  const layout = props.overrideLayout || mainLayout;

  const [search, setSearch] = useState<string>("");
  const setSearchTerm = (term: string) => setSearch(term.toLowerCase().trim());

  const [genre, setGenre] = useState<string>("all");

  const [showTrackDetail, setShowTrackDetail] = useState<boolean>(true);
  const toggleTrackDetail = () => setShowTrackDetail(!showTrackDetail);

  return (
    <ListOrGrid
      isLoading={props.isLoading}
      searchBarPlaceholder={props.dropdown ? "Search a track by title, album, or artist" : "Search a track by title"}
      onSearchTextChange={setSearchTerm}
      itemSize={gridItemSize}
      isShowingDetail={showTrackDetail}
      layoutType={layout}
      searchBarAccessory={
        props.dropdown ? (
          <ListOrGridDropdown tooltip="Genres" onChange={setGenre} layoutType={layout}>
            <ListOrGridDropdownItem value="all" title="All Genres" layoutType={layout} />
            <ListOrGridDropdownSection>
              {Array.from(new Set(props.tracks.map((track) => track.genre)))
                .sort((a, b) => a.localeCompare(b))
                .map((genre: string, index: number) => (
                  <ListOrGridDropdownItem key={index} title={genre} value={genre} layoutType={layout} />
                ))}
            </ListOrGridDropdownSection>
          </ListOrGridDropdown>
        ) : undefined
      }
    >
      {props.tracks
        .filter((track: Track) => genre === "all" || track.genre === genre)
        .filter((track: Track) => {
          return (
            track.name.toLowerCase().includes(search) ||
            track.album.toLowerCase().includes(search) ||
            track.artist.toLowerCase().includes(search)
          );
        })
        .sort(
          (a: Track, b: Track) =>
            a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album) || a.name.localeCompare(b.name)
        )
        .map((track) =>
          layout === LayoutType.Grid ? (
            <Grid.Item
              key={track.id}
              id={track.id}
              title={track.name}
              subtitle={track.artist}
              content={track.artwork || "../assets/no-track.png"}
              actions={<Actions layout={layout} id={track.id ?? ""} />}
            />
          ) : (
            <List.Item
              key={track.id}
              id={track.id}
              title={track.name}
              accessories={showTrackDetail ? null : [{ text: track.artist }]}
              icon={track.artwork || "../assets/no-track.png"}
              actions={<Actions layout={layout} id={track.id ?? ""} toggle={toggleTrackDetail} />}
              detail={<TrackDetail track={track} />}
            />
          )
        )}
    </ListOrGrid>
  );
};

function Actions({ id, layout, toggle }: { id: string; layout: LayoutType; toggle?: () => void }) {
  const playTrack = async () => {
    await pipe(
      id,
      music.track.playById,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this track"))
    )();
  };

  const playOnRepeat = async () => {
    await pipe(
      id,
      music.track.playOnRepeat,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this track"))
    )();
  };

  const showTrack = async () => {
    await pipe(
      id,
      music.track.revealTrack,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not find this track"))
    )();
  };

  return (
    <ActionPanel>
      <Action title="Play Track" icon={Icon.Play} onAction={playTrack} />
      <Action title="Play on Repeat" icon={Icon.Repeat} onAction={playOnRepeat} />
      <Action title="Show Track" icon={MusicIcon} shortcut={{ modifiers: ["cmd"], key: "o" }} onAction={showTrack} />
      <ActionPanel.Section>
        {layout === LayoutType.List && (
          <Action
            title="Toggle Track Detail"
            icon={Icon.AppWindowSidebarLeft}
            onAction={toggle}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
