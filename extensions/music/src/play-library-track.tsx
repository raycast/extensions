import { Grid, List, Action, ActionPanel, closeMainWindow, showToast, Toast, useNavigation } from "@raycast/api";
import { ListOrGrid, getViewLayout, getGridItemSize, getMaxNumberOfResults } from "./util/listorgrid";
import { getArtworkByIds } from "./util/scripts/track";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/string";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useCallback, useEffect, useState } from "react";
import { Track } from "./util/models";
import { fromEmptyOrNullable } from "./util/option";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";

export default function PlayLibraryTrack() {
  const [tracks, setTracks] = useState<readonly Track[] | null>([]);
  const [artworks, setArtworks] = useState<any>({});
  const { pop } = useNavigation();
  const layout = getViewLayout();
  const numResults = getMaxNumberOfResults();
  const gridItemSize = getGridItemSize();

  const onSearch = useCallback(
    async (next: string) => {
      if (!next) return;
      // start loading
      setTracks(null);
      setArtworks(null);

      await pipe(
        next,
        S.trim,
        music.track.search,
        TE.matchW(
          () => {
            showToast(Toast.Style.Failure, "Could not get tracks");
            return [] as ReadonlyArray<Track>;
          },
          (tracks) => {
            tracks = tracks.replace(/\s&\s/g, " and ");
            tracks = tracks.split("\n").slice(0, numResults).join("\n");
            return pipe(
              tracks,
              fromEmptyOrNullable,
              O.matchW(() => [] as ReadonlyArray<Track>, parseResult<Track>())
            );
          }
        ),
        T.map(setTracks)
      )();
    },
    [setTracks]
  );

  useEffect(() => {
    const getArtworks = async () => {
      if (tracks !== null) {
        const ids = tracks.map((track) => track.id);
        try {
          const artworks = await getArtworkByIds(ids);
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
  }, [tracks]);

  return (
    <ListOrGrid
      isLoading={artworks === null}
      searchBarPlaceholder="Search A Song By Title Or Artist"
      onSearchTextChange={onSearch}
      throttle={true}
      itemSize={gridItemSize}
    >
      {artworks &&
        (tracks ?? [])?.map(({ id, name, artist, album }, index) =>
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
              accessories={[{ text: artist }]}
              icon={artworks[id] || ""}
              actions={<Actions name={name} id={id ?? ""} pop={pop} />}
            />
          )
        )}
    </ListOrGrid>
  );
}

function Actions({ name, pop, id }: { id: string; name: string; pop: () => void }) {
  const title = `Start Track "${name}"`;

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
      <Action title={title} onAction={handleSubmit} />
    </ActionPanel>
  );
}
