import { ActionPanel, closeMainWindow, List, showToast, Toast, ToastStyle, useNavigation } from "@raycast/api";
import { isLeft } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/string";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import React, { useState } from "react";
import { Album } from "./util/models";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";

export default function PlayLibraryAlbum() {
  const [albums, setAlbums] = useState<readonly Album[] | null>([]);
  const { pop } = useNavigation();

  const onSearch = async (next: string) => {
    setAlbums(null); // start loading

    if (!next || next?.length < 1) {
      setAlbums([]);
      return;
    }

    await pipe(
      next,
      S.trim,
      music.track.search,
      TE.matchW(
        () => {
          showToast(Toast.Style.Failure, "Could not get albums");
          return [] as ReadonlyArray<Album>;
        },
        (tracks) =>
          pipe(
            tracks,
            O.fromNullable,
            O.matchW(() => [] as ReadonlyArray<Album>, parseResult<Album>())
          )
      ),
      T.map(setAlbums)
    )();
  };

  return (
    <List
      isLoading={albums === null}
      searchBarPlaceholder="Search A Song By Album Or Artist"
      onSearchTextChange={onSearch}
      throttle
    >
      {albums &&
        albums?.length > 0 &&
        albums.map(({ id, name, artist, count }) => (
          <List.Item
            key={id}
            title={name}
            subtitle={artist}
            accessoryTitle={count ? `🎧 ${count}` : ""}
            icon={{ source: "../assets/icon.png" }}
            actions={<Actions name={name} pop={pop} />}
          />
        ))}
    </List>
  );
}

function Actions({ name, pop }: { name: string; pop: () => void }) {
  const title = `Start Album "${name}"`;

  const handleSubmit = async () => {
    await pipe(
      name,
      music.albums.play,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this album"))
    )();

    pop();
  };

  return (
    <ActionPanel>
      <ActionPanel.Item title={title} onAction={handleSubmit} />
    </ActionPanel>
  );
}
