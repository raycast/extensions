/**
 * Retrieves the user's playlists and groups them by kind.
 */
import { pipe, flow } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as A from "fp-ts/ReadonlyNonEmptyArray";
import { parseResult } from "../util/parser";
import * as music from "../util/scripts";
import { Playlist } from "../util/models";

// Define the playlist kind to request. We're using "user" as in the UI.
enum PlaylistKind {
  ALL = "all",
  USER = "user",
  SUBSCRIPTION = "subscription",
}

type Input = {
  /**
   * The kind of playlists to retrieve.
   * This can be "all", "user", or "subscription".
   * Default is "all".
   */
  kind?: PlaylistKind;
};

export default async function getPlaylists(input: Input) {
  const kind = input.kind ?? PlaylistKind.ALL;
  return await pipe(
    music.playlists.getPlaylists(kind),
    TE.mapLeft((error) => {
      throw new Error(`Failed to get playlists: ${error}`);
    }),
    TE.map(
      flow(parseResult<Playlist>(), (data) =>
        A.groupBy<Playlist>((playlist) => playlist.kind?.split(" ")?.[0] ?? "Other")(data),
      ),
    ),
  )();
}
