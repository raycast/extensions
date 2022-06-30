import * as TE from "fp-ts/TaskEither";
import { tell, runScript, createQueryString } from "../apple-script";
import { pipe } from "fp-ts/lib/function";
import { general } from ".";
import { runAppleScript } from "run-applescript";
import { getViewLayout, getImageSize } from "../listorgrid";
import { parseImageStream } from "../artwork";

const layout = getViewLayout();
const imageSize = getImageSize(); 

const outputQuery = createQueryString({
  id: "pId",
  name: "pName",
  duration: "pDuration",
  count: "pCount",
  time: "pTime",
  kind: "pKind",
});

enum PlaylistKind {
  ALL = "all",
  USER = "user",
  SUBSCRIPTION = "subscription",
}

const playListKindToString = (kind: PlaylistKind) => (kind === PlaylistKind.ALL ? "" : kind);

const loopThroughPlaylists = (kind: PlaylistKind) => `
	repeat with selectedPlaylist in ${playListKindToString(kind)} playlists
		set pId to the id of selectedPlaylist
		set pName to the name of selectedPlaylist
		set pDuration to the duration of selectedPlaylist
		set pCount to count (tracks of selectedPlaylist)
		set pTime to the time of selectedPlaylist
		set pKind to the class of selectedPlaylist
		set output to output & ${outputQuery} & "\n"
    end repeat
`;

export const play =
  (shuffle = false) =>
  (name: string): TE.TaskEither<Error, string> =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() => tell("Music", `play playlist "${name.trim()}"`))
    );

export const playById =
  (shuffle = false) =>
  (id: string) =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() => tell("Music", `play (every playlist whose id is "${id}")`))
    );

export const getPlaylists = (kind: PlaylistKind): TE.TaskEither<Error, string> =>
  runScript(`
	set output to ""
        tell application "Music"
			${kind === PlaylistKind.ALL ? loopThroughPlaylists(PlaylistKind.ALL) : loopThroughPlaylists(kind)}
        end tell
	return output
`);

export const getArtworkByIds = async (ids: string[]) => {
  const result: any = {};
  const size = (layout === "list" || ids.length > 10) ? imageSize : undefined;
  const promises = ids.map(async (id) => {
    const data = await runAppleScript(`
      tell application "Music"
        set playlistArtwork to first artwork of first playlist of (every playlist whose id is ${id})
        set playlistImage to data of playlistArtwork
      end tell
      return playlistImage
    `);
    result[id] = await parseImageStream(data, size);
  });
  await Promise.all(promises);
  return result;
};
