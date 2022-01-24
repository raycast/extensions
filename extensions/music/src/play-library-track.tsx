import { ActionPanel, closeMainWindow, List, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { isLeft } from "fp-ts/lib/Either";
import React, { useState } from "react";
import { playTrack, seachForTrack } from "./util/controls";
import { Track } from "./util/models";
import { parseResult } from "./util/parser";

export default function PlayLibraryTrack() {
  const [tracks, setTracks] = useState<Track[] | null>();
  const { pop } = useNavigation();

  const onSearch = async (next: string) => {
    if (!next || next?.length < 1) {
      setTracks([]);
      return;
    }
    const raw = await seachForTrack(next)();
    if (isLeft(raw)) {
      showToast(ToastStyle.Failure, "Could not get tracks");
      return;
    }
    let result: Track[] = [];
    if (raw.right?.length > 0) {
      result = parseResult<Track>(raw.right);
    }
    setTracks(result);
  };

  return (
    <List
      isLoading={tracks === null}
      searchBarPlaceholder="Search A Song By Title Or Artist"
      onSearchTextChange={onSearch}
      throttle
    >
      {tracks &&
        tracks?.length > 0 &&
        tracks.map(({ id, name, artist, album }) => (
          <List.Item
            key={id}
            title={name}
            subtitle={artist}
            accessoryTitle={`💿 ${album}`}
            icon={{ source: "../assets/icon.png" }}
            actions={<Actions name={name} pop={pop} />}
          />
        ))}
    </List>
  );
}

function Actions({ name, pop }: { name: string; pop: () => void }) {
  const title = `Start Track "${name}"`;

  const handleSubmit = async () => {
    const play = await playTrack(name)();
    if (isLeft(play)) {
      showToast(ToastStyle.Failure, "Could not play this track");
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
