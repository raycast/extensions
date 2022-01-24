import { ActionPanel, closeMainWindow, List, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { isLeft } from "fp-ts/lib/Either";
import React, { useState } from "react";
import { playAlbum, seachForAlbum } from "./util/controls";
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
    const raw = await seachForAlbum(next)();
    if (isLeft(raw)) {
      showToast(ToastStyle.Failure, "Could not get albums");
      return;
    }
    let result: Album[] = [];
    if (raw.right?.length > 0) {
      result = parseResult<Album>(raw.right);
    }
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
