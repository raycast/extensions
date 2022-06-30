import { Grid, List, Action, ActionPanel, closeMainWindow, showToast, Toast, useNavigation } from "@raycast/api";
import { ListOrGrid, getViewLayout, getGridItemSize, getMaxNumberOfResults } from "./util/listorgrid";
import { getArtworkByIds } from "./util/scripts/track";
import { flow, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/string";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";
import { Album } from "./util/models";
import { fromEmptyOrNullable } from "./util/option";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";

export default function PlayLibraryAlbum() {
  const [albums, setAlbums] = useState<readonly Album[] | null>([]);
  const [artworks, setArtworks] = useState<any>({});
  const { pop } = useNavigation();
  const layout = getViewLayout();
  const numResults = getMaxNumberOfResults();
  const gridItemSize = getGridItemSize();

  const onSearch = async (next: string) => {
    if (!next) return;
    // start loading
    setAlbums(null);
    setArtworks(null);

    await pipe(
      next,
      S.trim,
      music.albums.search,
      TE.matchW(
        () => {
          showToast(Toast.Style.Failure, "Could not get albums");
          return [] as ReadonlyArray<Album>;
        },
        (albums) => {
          albums = albums.replace(/\s&\s/g, " and ");
          albums = albums.split("\n").slice(0, numResults).join("\n");
          return pipe(
            albums,
            fromEmptyOrNullable,
            O.matchW(() => [] as ReadonlyArray<Album>, parseResult<Album>())
          );
        }
      ),
      T.map(setAlbums)
    )();
  };

  useEffect(() => {
    const getArtworks = async () => {
      if (albums !== null) {
        const ids = albums.map((album) => album.id);
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
  }, [albums]);

  return (
    <ListOrGrid
      isLoading={artworks === null}
      searchBarPlaceholder="Search A Song By Album Or Artist"
      onSearchTextChange={onSearch}
      throttle={true}
      itemSize={gridItemSize}
    >
      {artworks &&
        (albums || [])?.map(({ id, name, artist, count }) =>
          layout === "grid" ? (
            <Grid.Item
              key={id}
              title={name ?? "No Name"}
              subtitle={artist ?? "No Artist"}
              content={artworks[id] || ""}
              actions={<Actions name={name} pop={pop} />}
            />
          ) : (
            <List.Item
              key={id}
              title={name ?? "No Name"}
              accessories={[{ text: artist ?? "No Artist" }]}
              icon={artworks[id] || ""}
              actions={<Actions name={name} pop={pop} />}
            />
          )
        )}
    </ListOrGrid>
  );
}

function Actions({ name, pop }: { name: string; pop: () => void }) {
  const title = `Start Album "${name}"`;

  const handleSubmit = (shuffle?: boolean) => async () => {
    await pipe(
      name,
      music.albums.play(shuffle),
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this album"))
    )();

    pop();
  };

  return (
    <ActionPanel>
      <Action title={title} onAction={handleSubmit(false)} />
      <Action title={`Shuffle Album ${name}`} onAction={handleSubmit(true)} />
    </ActionPanel>
  );
}
