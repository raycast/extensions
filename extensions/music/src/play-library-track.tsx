import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/string";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useCallback, useState, useEffect } from "react";

import { Track } from "./util/models";
import { fromEmptyOrNullable } from "./util/option";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";

const EMPTY_TEXT = " "; // Visually empty but non-empty to prevent jumping around

export default function PlayLibraryTrack() {
  const [tracks, setTracks] = useState<readonly Track[] | null>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    pipe(music.currentTrack.getCurrentTrack(), TE.map(setCurrentTrack))();
  }, []);

  const onSearch = useCallback(
    async (next: string) => {
      setTracks(null); // start loading

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
          (tracks) =>
            pipe(
              tracks,
              fromEmptyOrNullable,
              O.matchW(() => [] as ReadonlyArray<Track>, parseResult<Track>()),
            ),
        ),
        T.map(setTracks),
      )();
    },
    [setTracks],
  );

  const trackList = tracks ?? [];

  return (
    <List
      isLoading={tracks === null || currentTrack === null}
      searchBarPlaceholder="Search A Song By Title Or Artist"
      onSearchTextChange={onSearch}
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
