import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as S from "fp-ts/string";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useCallback, useEffect, useState } from "react";

import { Album, Track } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

const EMPTY_TEXT = " "; // Visually empty but non-empty to prevent jumping around

export default function PlayLibraryAlbum() {
  const [searchResults, setSearchResults] = useState<readonly Album[] | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const { pop } = useNavigation();

  const { isLoading: isLoadingAll, data: allAlbums } = useCachedPromise(
    () =>
      pipe(
        music.albums.getAll,
        TE.matchW(
          () => {
            showToast(Toast.Style.Failure, "Could not get albums");
            return [] as ReadonlyArray<Album>;
          },
          (albums) => albums,
        ),
      )(),
    [],
    { keepPreviousData: true },
  );

  useEffect(() => {
    pipe(music.currentTrack.getCurrentTrack(), TE.map(setCurrentTrack))();
  }, []);

  const onSearch = useCallback(async (next: string) => {
    if (!next || next.length < 1) {
      setSearchResults(null); // back to showing all albums
      return;
    }

    await pipe(
      next,
      S.trim,
      music.albums.search,
      TE.matchW(
        () => {
          showToast(Toast.Style.Failure, "Could not get albums");
          return [] as ReadonlyArray<Album>;
        },
        (albums) => albums,
      ),
      T.map((results) => setSearchResults(results)),
    )();
  }, []);

  const albums = searchResults ?? allAlbums ?? [];

  return (
    <List
      isLoading={isLoadingAll}
      searchBarPlaceholder="Search A Song By Album Or Artist"
      onSearchTextChange={onSearch}
      throttle
    >
      {albums.length > 0 ? (
        albums.map(({ id, name, artist, count }) => (
          <List.Item
            key={id}
            title={name ?? "--"}
            subtitle={artist ?? "--"}
            accessories={[{ text: count ? `${count}` : "" }]}
            icon={{ source: "../assets/icon.png" }}
            actions={<Actions name={name} pop={pop} />}
          />
        ))
      ) : (
        <List.EmptyView
          title={`${currentTrack?.name ?? EMPTY_TEXT}`}
          description={`${currentTrack?.album ?? EMPTY_TEXT}\n${currentTrack?.artist ?? EMPTY_TEXT}`}
          icon={Icon.Music}
        />
      )}
    </List>
  );
}

function Actions({ name, pop }: { name: string; pop: () => void }) {
  const title = `Start Album "${name}"`;

  const handleSubmit = (shuffle?: boolean) => async () => {
    await pipe(
      name,
      music.albums.play(shuffle),
      TE.map(() => closeMainWindow()),
      handleTaskEitherError("Operation failed."),
    )();

    pop();
  };

  return (
    <ActionPanel>
      <Action title={title} onAction={handleSubmit(false)} icon={Icon.Play} />
      <Action title={`Shuffle Album ${name}`} onAction={handleSubmit(true)} icon={Icon.Shuffle} />
    </ActionPanel>
  );
}
