import * as TE from "fp-ts/TaskEither";
import { tell, runScript, createQueryString } from "../apple-script";
import { pipe } from "fp-ts/lib/function";
import { general } from ".";
import { runAppleScript } from "run-applescript";
import resizeImg from "resize-image-buffer";
import { getViewLayout, getImageSize } from "../listorgrid";

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
  const layout = getViewLayout();
  const size = getImageSize();
  const num = ids.length;
  const promises = ids.map(async (id) => {
    const res = await runAppleScript(`
      tell application "Music"
        set playlistArtwork to first artwork of first playlist of (every playlist whose id is ${id})
        set playlistImage to data of playlistArtwork
      end tell
      return playlistImage
    `);
    let binary = null;
    try {
      const image_type = res.slice(6, 10);
      if (image_type == "JPEG") {
        binary = res.split("JPEG")[1].slice(0, -1);
        let image = Buffer.from(binary, "hex");
        if (layout == "list" || num > 10) image = await resizeImg(image, size);
        result[id] = "data:image/jpeg;base64," + image.toString("base64");
      } else if (image_type == "tdta") {
        binary = res.split("tdta")[1].slice(0, -1);
        let image = Buffer.from(binary, "hex");
        if (layout == "list" || num > 10) image = await resizeImg(image, size);
        result[id] = "data:image/png;base64," + image.toString("base64");
      }
    } catch (err) {
      result[id] = "";
    }
  });
  await Promise.all(promises);
  return result;
};
