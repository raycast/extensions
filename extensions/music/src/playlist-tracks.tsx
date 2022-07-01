import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getPlaylistTracksLayout, getMaxNumberOfResults } from "./util/listorgrid";
import { Track } from "./util/models";
import { Tracks } from "./tracks";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/string";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { fromEmptyOrNullable } from "./util/option";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";

export const PlaylistTracks = (props: { id: string }) => {
  const [tracks, setTracks] = useState<readonly Track[] | null>(null);

  const layout = getPlaylistTracksLayout();
  const numResults = getMaxNumberOfResults(layout);

  useEffect(() => {
    const getTracks = async () => {
      await pipe(
        props.id,
        S.trim,
        music.playlists.tracks,
        TE.matchW(
          () => {
            showToast(Toast.Style.Failure, "Could not get tracks");
            return [] as ReadonlyArray<Track>;
          },
          (tracks) => {
            tracks = tracks.replace(/\s&\s/g, " and ");
            tracks = tracks.split("\n").slice(0, numResults).join("\n");
            return pipe(
              tracks,
              fromEmptyOrNullable,
              O.matchW(() => [] as ReadonlyArray<Track>, parseResult<Track>())
            );
          }
        ),
        T.map(setTracks)
      )();
    };
    getTracks();
  }, []);

  return <Tracks tracks={tracks} throttle={false} overrideLayout={layout} />;
};
