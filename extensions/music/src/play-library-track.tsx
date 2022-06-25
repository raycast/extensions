import { Action, ActionPanel, closeMainWindow, Grid, showToast, Toast, useNavigation } from "@raycast/api";
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
import { getArtworkByIds } from "./util/scripts/track";

export default function PlayLibraryTrack() {
  const [tracks, setTracks] = useState<readonly Track[] | null>([]);
  const [artworks, setArtworks] = useState<any>({});
  const { pop } = useNavigation();

  const onSearch = useCallback(
    async (next: string) => {
      // start loading 
      if (next) {
        setTracks(null); 
        setArtworks(null);
      }
      else return; 

      if (!next || next?.length < 1) {
        setTracks([]);
        return;
      }

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
            // console.log(tracks)
            return pipe(
              tracks,
              fromEmptyOrNullable,
              O.matchW(() => [] as ReadonlyArray<Track>, parseResult<Track>())
            )
          }
        ),
        T.map(setTracks)
      )();
    },
    [setTracks]
  );

  useEffect(() => {
    const getArtworks = async () => {
      if (tracks !== null && tracks.length > 0) {
        const ids = tracks.map((track) => track.id);
        try {
          const start_time = new Date().getTime();
          const res = await getArtworkByIds(ids);
          setArtworks(res);
          const end_time = new Date().getTime();
          console.log(`Time: ${end_time - start_time}ms`);
        }
        catch (err) {
          console.log(err)
          showToast(Toast.Style.Failure, "Error: Failed to get track artworks");
        }
      }
    }
    getArtworks();
    return () => {
      setArtworks(null);
    }
  }, [tracks]);

  const [row, setRow] = useState<number>(0);

  // const selectionChange = async (id?: string) => {
  //   if (id && tracks) {
  //     const currentRow = Math.floor(parseInt(id) / 5);
  //     if (currentRow > row) {
  //       const index_to_get = (currentRow + 2) * 5; 
  //       const index_to_remove = (currentRow - 2) * 5;
  //       if (index_to_remove >= 0) {
  //         const ids = tracks.slice(index_to_remove, index_to_remove + 5).map((track) => track.id);
  //         ids.map((id) => delete artworks[id]);
  //       }
  //       const ids = tracks.slice(index_to_get, index_to_get + 5).map((track) => track.id);
  //       if (ids.length > 0) {
  //         const res = await getArtworkByIds(ids);
  //         setArtworks({ ...artworks, ...res });
  //       }
  //     }
  //     else if (currentRow < row) {
        
  //     }
  //     else return; 
  //     setRow(currentRow);
  //   }
  // }

  return (
    <Grid
      isLoading={artworks === null}
      searchBarPlaceholder="Search A Song By Title Or Artist"
      onSearchTextChange={onSearch}
      throttle={true}
      itemSize={Grid.ItemSize.Medium}
      // onSelectionChange={selectionChange}
    >
      {artworks && (tracks ?? [])?.map(({ id, name, artist, album }, index) => (
        <Grid.Item
          key={id}
          id={index.toString()}
          title={name}
          subtitle={`${artist} · ${album}`}
          content={artworks[id] || ""}
          actions={<Actions name={name} id={id ?? ""} pop={pop} />}
        />
      ))}
    </Grid>
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
