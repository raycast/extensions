import { ActionPanel, closeMainWindow, List, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { Either, isLeft } from "fp-ts/lib/Either";
import React, { useEffect, useState } from "react";
import { getPlaylists, playPlaylist } from "./util/controls";
import { Playlist } from "./util/models";
import { parseResult } from "./util/parser";

export default function PlaySelected() {
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    const getPlaylistNames = async () => {
      const raw: Either<Error, string> = await getPlaylists()();
      if (isLeft(raw)) {
        showToast(ToastStyle.Failure, "Could not get your playlists");
        return;
      }
      let result: Playlist[] = [];
      if (raw.right?.length > 0) {
        result = parseResult<Playlist>(raw.right);
      }
      setPlaylists(result);
    };

    getPlaylistNames();
  }, []);

  return (
    <List isLoading={playlists === null} searchBarPlaceholder="Search A Playlist">
      {playlists &&
        playlists?.length > 0 &&
        playlists.map(({ id, name, duration, count }) => (
          <List.Item
            key={id}
            title={name}
            accessoryTitle={`🎧 ${count}  ⏱ ${Math.floor(Number(duration) / 60)} min`}
            icon={{ source: "../assets/icon.png" }}
            actions={<Actions name={name} pop={pop} />}
          />
        ))}
    </List>
  );
}

function Actions({ name, pop }: { name: string; pop: () => void }) {
  const title = `Start Playlist "${name}"`;

  const handleSubmit = async () => {
    const play = await playPlaylist(name)();
    if (isLeft(play)) {
      showToast(ToastStyle.Failure, "Could not play this playlist");
      return;
    }
    await closeMainWindow();
    pop();
  };

  return (
    <ActionPanel title={title}>
      <ActionPanel.Item title={title} onAction={handleSubmit} />
    </ActionPanel>
  );
}
