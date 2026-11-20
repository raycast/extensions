import { closeMainWindow, LaunchProps } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { parseTrackSearchResults } from "./util/search-tracks";
import * as music from "./util/scripts";
import { hud } from "./util/feedback";

export default async (props: LaunchProps<{ arguments: Arguments.JustPlay }>) => {
  const { query } = props.arguments;

  await closeMainWindow();

  await pipe(
    music.track.search(query),
    TE.chainW((raw) => {
      const tracks = parseTrackSearchResults(raw, query);

      const track = tracks[0];
      if (!track?.id) {
        return TE.left(new Error(`No results for "${query}"`));
      }

      return pipe(
        music.track.playById(track.id),
        TE.map(() => track),
      );
    }),
    TE.match(
      (error) => hud(error.message),
      (track) => hud(`Playing ${track.name} by ${track.artist}`),
    ),
  )();
};
