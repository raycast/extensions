import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { useState } from "react";

import { parseTrackSearchResults } from "./util/search-tracks";
import * as music from "./util/scripts";

const EMPTY_TEXT = " "; // Visually empty but non-empty to prevent jumping around

export default function PlayLibraryTrack() {
  const [searchText, setSearchText] = useState("");
  const { pop } = useNavigation();
  const { data: currentTrack, isLoading: isLoadingCurrentTrack } = useCachedPromise(() =>
    pipe(
      music.currentTrack.getCurrentTrack(),
      TE.getOrElseW(() => async () => null),
    )(),
  );
  const { data: trackList = [], isLoading } = useCachedPromise(
    async (search: string) => {
      if (!search) return [];
      const result = await music.track.search(search)();
      if (result._tag === "Left") throw result.left;
      return parseTrackSearchResults(result.right, search);
    },
    [searchText.trim()],
    {
      onError: async () => {
        await showToast(Toast.Style.Failure, "Could not get tracks");
      },
    },
  );

  return (
    <List
      isLoading={isLoading || isLoadingCurrentTrack}
      filtering={false}
      searchBarPlaceholder="Search A Song By Title Or Artist"
      onSearchTextChange={setSearchText}
      throttle
    >
      {trackList.length > 0 ? (
        trackList.map(({ id, name, artist, album }) => (
          <List.Item
            key={id}
            title={name}
            subtitle={`${artist}`}
            accessories={[{ text: `${album}` }]}
            icon={{ source: "../assets/icon.png" }}
            actions={<Actions name={name} id={id ?? ""} pop={pop} />}
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

function Actions({ name, pop, id }: { id: string; name: string; pop: () => void }) {
  const title = `Start Track "${name}"`;

  const handleSubmit = async () => {
    await pipe(
      id,
      music.track.playById,
      TE.map(() => closeMainWindow()),
      TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this track")),
    )();

    pop();
  };

  return (
    <ActionPanel>
      <Action title={title} onAction={handleSubmit} icon={Icon.Play} />
    </ActionPanel>
  );
}
