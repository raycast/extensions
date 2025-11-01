import { updateCommandMetadata } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import * as music from "./util/scripts";

export default async () => {
  await pipe(
    music.currentTrack.getCurrentTrack(),
    TE.map((track) => updateCommandMetadata({ subtitle: `${track.name} - ${track.artist}` })),
    TE.mapLeft(() => updateCommandMetadata({ subtitle: "Could not get currently playing track" })),
  )();
};
