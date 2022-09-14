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

interface TracksComponent {
  tracks: Track[];
  isLoading: boolean;
  overrideLayout?: LayoutType;
  dropdown: boolean;
}

const SortOptions = {
  Default: "Artist",
  DateAdded: "Date Added",
  PlayedCount: "Played Count",
  PlayedDuration: "Played Duration",
  Album: "Album",
  Title: "Title",
};

const sortCache = new Cache();

export const Tracks = (props: TracksComponent): JSX.Element => {
  const layout = props.overrideLayout || mainLayout;
  const { trackDropdown }: Preferences = getPreferenceValues();

  const [search, setSearch] = useState<string>("");
  const setSearchTerm = (term: string) => setSearch(term.toLowerCase().trim());

  const [genre, setGenre] = useState<string>("all");
  const [sort, setSort] = useState<string>(
    trackDropdown === TrackDropdownOption.SortBy ? sortCache.get("sort") || SortOptions.Default : SortOptions.Default
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
                setSort(value);
                sortCache.set("sort", value);
              }}
            >
              {Object.entries(SortOptions).map(([key, item]: [string, string]) => (
                <ListOrGridDropdownItem key={key} value={key} title={item} layoutType={layout} />
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
      {props.tracks
        .filter((track: Track) => genre === "all" || track.genre === genre)
        .filter((track: Track) => {
          return (
            track.name.toLowerCase().includes(search) ||
            track.album.toLowerCase().includes(search) ||
            track.artist.toLowerCase().includes(search)
          );
        })
        .sort((a: Track, b: Track) => {
          switch (sort) {
            case "DateAdded":
              return (
                b.dateAdded - a.dateAdded ||
                a.artist.localeCompare(b.artist) ||
                a.album.localeCompare(b.album) ||
                a.name.localeCompare(b.name)
              );
            case "PlayedCount":
              return (
                b.playedCount - a.playedCount ||
                a.artist.localeCompare(b.artist) ||
                a.album.localeCompare(b.album) ||
                a.name.localeCompare(b.name)
              );
            case "PlayedDuration":
              return b.playedCount * b.duration - a.playedCount * a.duration;
            case "Album":
              return a.album.localeCompare(b.album) || a.name.localeCompare(b.name);
            case "Title":
              return a.name.localeCompare(b.name);
            case "Artist":
            default:
              return a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album) || a.name.localeCompare(b.name);
          }
        })
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
