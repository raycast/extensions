import {
  Grid,
  List,
  Action,
  ActionPanel,
  closeMainWindow,
  showToast,
  Toast,
  Icon,
  Cache,
  getPreferenceValues,
} from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { useState } from "react";

import { TrackDetail } from "./track-detail";
import {
  ListOrGrid,
  gridItemSize,
  ListOrGridDropdown,
  ListOrGridDropdownItem,
  ListOrGridDropdownSection,
  LayoutType,
  mainLayout,
} from "./util/list-or-grid";
import { Preferences, Track, TrackDropdownOption } from "./util/models";
import { Icons } from "./util/presets";
import * as music from "./util/scripts";
import { SortOption, filterTracks } from "./util/search";

interface TracksComponent {
  tracks: Track[];
  isLoading: boolean;
  overrideLayout?: LayoutType;
  dropdown: boolean;
}

const sortCache = new Cache();

export const Tracks = (props: TracksComponent): JSX.Element => {
  const layout = props.overrideLayout || mainLayout;
  const { trackDropdown }: Preferences = getPreferenceValues();

  const [search, setSearch] = useState<string>("");
  const setSearchTerm = (term: string) => setSearch(term.toLowerCase().trim());

  const [genre, setGenre] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>(
    trackDropdown === TrackDropdownOption.SortBy
      ? (sortCache.get("sort") as SortOption) || SortOption.Default
      : SortOption.Default
  );

  const [showTrackDetail, setShowTrackDetail] = useState<boolean>(true);
  const toggleTrackDetail = () => setShowTrackDetail(!showTrackDetail);

  return (
    <ListOrGrid
      isLoading={props.isLoading || sort === undefined}
      searchBarPlaceholder={props.dropdown ? "Search a track by title, album, or artist" : "Search a track by title"}
      onSearchTextChange={setSearchTerm}
      itemSize={gridItemSize}
      isShowingDetail={showTrackDetail}
      layoutType={layout}
      searchBarAccessory={
        props.dropdown ? (
          trackDropdown === TrackDropdownOption.SortBy ? (
            <ListOrGridDropdown
              tooltip="Sort By"
              defaultValue={sort}
              layoutType={layout}
              onChange={(value: string) => {
                setSort(value as SortOption);
                sortCache.set("sort", value);
              }}
            >
              {Object.entries(SortOption).map(([key, item]: [string, string]) => (
                <ListOrGridDropdownItem key={key} value={item} title={item} layoutType={layout} />
              ))}
            </ListOrGridDropdown>
          ) : (
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
          )
        ) : undefined
      }
    >
      {filterTracks(props.tracks, search, genre, sort).map((track) =>
        layout === LayoutType.Grid ? (
          <Grid.Item
            key={track.id}
            id={track.id}
            title={track.name}
            subtitle={track.artist}
            content={track.artwork || "../assets/no-track.png"}
            actions={<Actions layout={layout} track={track} />}
          />
        ) : (
          <List.Item
            key={track.id}
            id={track.id}
            title={track.name}
            accessories={showTrackDetail ? null : [{ text: track.artist }]}
            icon={track.artwork || "../assets/no-track.png"}
            actions={<Actions layout={layout} track={track} toggle={toggleTrackDetail} />}
            detail={<TrackDetail track={track} />}
          />
        )
      )}
    </ListOrGrid>
  );
};

function Actions({ track, layout, toggle }: { track: Track; layout: LayoutType; toggle?: () => void }) {
  const playTrack = async () => {
    await pipe(
      track,
      music.track.play,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this track"))
    )();
  };

  const playOnRepeat = async () => {
    await pipe(
      track,
      music.track.playOnRepeat,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this track"))
    )();
  };

  const showTrack = async () => {
    await pipe(
      track,
      music.track.revealTrack,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not find this track"))
    )();
  };

  return (
    <ActionPanel>
      <Action title="Play Track" icon={Icon.Play} onAction={playTrack} />
      <Action title="Play on Repeat" icon={Icon.Repeat} onAction={playOnRepeat} />
      <Action title="Show Track" icon={Icons.Music} shortcut={{ modifiers: ["cmd"], key: "o" }} onAction={showTrack} />
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
