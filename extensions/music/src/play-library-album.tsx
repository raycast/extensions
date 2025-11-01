import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { flow, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/string";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";

import { Album, Track } from "./util/models";
import { fromEmptyOrNullable } from "./util/option";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

const EMPTY_TEXT = " "; // Visually empty but non-empty to prevent jumping around

export default function PlayLibraryAlbum() {
  const [albums, setAlbums] = useState<readonly Album[] | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const { pop } = useNavigation();

  const loadAll = pipe(
    music.albums.getAll,
    TE.map(parseResult<Album>()),
    TE.matchW(
      () => {
        showToast(Toast.Style.Failure, "Could not get albums");
        return [] as ReadonlyArray<Album>;
      },
      flow(
        fromEmptyOrNullable,
        O.matchW(() => setAlbums([]), setAlbums),
      ),
    ),
  );

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    pipe(music.currentTrack.getCurrentTrack(), TE.map(setCurrentTrack))();
  }, []);

  const onSearch = async (next: string) => {
    setAlbums(null); // start loading

    if (!next || next?.length < 1) {
      setAlbums(null);
      await loadAll();
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
        (tracks) =>
          pipe(
            tracks,
            fromEmptyOrNullable,
            O.matchW(() => [] as ReadonlyArray<Album>, parseResult<Album>()),
          ),
      ),
      T.map(setAlbums),
    )();
  };

  const albumList = albums ?? [];

  return (
    <List
      isLoading={albums === null || currentTrack === null}
      searchBarPlaceholder="Search A Song By Album Or Artist"
      onSearchTextChange={onSearch}
      throttle
    >
      {albumList.length > 0 ? (
        albumList.map(({ id, name, artist, count }) => (
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
