import { ActionPanel, closeMainWindow, List, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { isLeft } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import React, { useState } from "react";
import { playAlbum, searchForAlbum } from "./util/controls";
import { Album } from "./util/models";
import { parseResult } from "./util/parser";

export default function PlayLibraryAlbum() {
  const [albums, setAlbums] = useState<Album[] | null>();
  const { pop } = useNavigation();

  const onSearch = async (next: string) => {
    setAlbums(null);
    if (!next || next?.length < 1) {
      setAlbums([]);
      return;
    }

    const result = await pipe(
      next,
      searchForAlbum,
      TE.matchW(
        () => {
          showToast(ToastStyle.Failure, "Could not get albums");
          return [];
        },
        (albums) =>
          pipe(
            albums,
            O.fromNullable,
            O.matchW(
              () => [],
              (res) => (res ? parseResult<Album>(res) : [])
            )
          )
      )
    )();
    setAlbums(result);
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
    const play = await playAlbum(name)();
    if (isLeft(play)) {
      showToast(ToastStyle.Failure, "Could not play this album");
      return;
    }
    await closeMainWindow();
    pop();
  };

  return (
    <ActionPanel>
      <ActionPanel.Item title={title} onAction={handleSubmit} />
    </ActionPanel>
  );
}
