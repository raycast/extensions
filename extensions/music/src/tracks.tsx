import { Grid, List, Action, ActionPanel, closeMainWindow, showToast, Toast, useNavigation } from "@raycast/api";
import { ListOrGrid, getViewLayout, getGridItemSize } from "./util/listorgrid";
import { getArtworkByIds } from "./util/scripts/track";
import { useEffect, useState } from "react";
import { Track } from "./util/models";
import { TrackDetail } from "./track-detail";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as music from "./util/scripts";

interface TracksComponent {
  tracks: readonly Track[] | null;
  throttle: boolean;
  onSearch?: any;
  overrideLayout?: string;
}

export const Tracks = (props: TracksComponent): JSX.Element => {
  const [artworks, setArtworks] = useState<any>({});
  const [showTrackDetail, setShowTrackDetail] = useState<boolean>(true);

  const toggleTrackDetail = () => {
    setShowTrackDetail(!showTrackDetail);
  };

  const { pop } = useNavigation();
  const layout = props.overrideLayout || getViewLayout();
  const gridItemSize = getGridItemSize();

  useEffect(() => {
    const getArtworks = async () => {
      if (props.tracks !== null) {
        if (props.tracks.length == 0) {
          setArtworks({});
          return;
        }
        const ids = props.tracks.map((track) => track.id);
        try {
          const artworks = await getArtworkByIds(ids, props.overrideLayout);
          setArtworks(artworks);
        } catch {
          showToast(Toast.Style.Failure, "Error: Failed to get track artworks");
        }
      } else setArtworks(null);
    };
    getArtworks();
    return () => {
      setArtworks(null);
    };
  }, [props.tracks]);

  return (
    <ListOrGrid
      isLoading={props.tracks === null || artworks === null}
      searchBarPlaceholder="Search A Song By Title Or Artist"
      onSearchTextChange={props.onSearch}
      throttle={props.throttle}
      itemSize={gridItemSize}
      isShowingDetail={showTrackDetail}
      overrideLayout={layout}
      actions={
        layout === "list" && (
          <ActionPanel>
            <Action title="Toggle Track Detail" onAction={toggleTrackDetail} />
          </ActionPanel>
        )
      }
    >
      {artworks &&
        (props.tracks ?? [])?.map(({ id, name, artist, album }, index) =>
          layout === "grid" ? (
            <Grid.Item
              key={id}
              id={index.toString()}
              title={name}
              subtitle={artist}
              content={artworks[id] || ""}
              actions={<Actions name={name} id={id ?? ""} pop={pop} />}
            />
          ) : (
            <List.Item
              key={id}
              id={index.toString()}
              title={name}
              accessories={showTrackDetail ? null : [{ text: artist }]}
              icon={artworks[id] || ""}
              actions={<Actions name={name} id={id ?? ""} pop={pop} toggle={toggleTrackDetail} />}
              detail={<TrackDetail id={id} />}
            />
          )
        )}
    </ListOrGrid>
  );
};

function Actions({ id, name, pop, toggle }: { id: string; name: string; pop: () => void; toggle?: () => void }) {
  const handleSubmit = async () => {
    await pipe(
      id,
      music.track.playById,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this track"))
    )();

    pop();
  };

  return (
    <ActionPanel>
      <Action title="Play Track" onAction={handleSubmit} />
      <ActionPanel.Section>
        <Action title="Toggle Track Detail" onAction={toggle} shortcut={{ modifiers: ["cmd"], key: "d" }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
