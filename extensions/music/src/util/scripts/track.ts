import { createQueryString, runScript, tell } from "../apple-script";
import { runAppleScript } from "run-applescript";
import { getViewLayout, getImageSize } from "../listorgrid";
import { parseImageStream } from "../artwork";

const layout = getViewLayout();
const imageSize = getImageSize();

export const search = (search: string) => {
  const outputQuery = createQueryString({
    id: "trackId",
    name: "trackName",
    artist: "artistName",
    album: "albumName",
    duration: "trackDuration",
  });

  return runScript(`
		set output to ""
			tell application "Music"
				set results to (every track whose name contains "${search}" or artist contains "${search}")
				repeat with selectedTrack in results
					set trackId to the id of selectedTrack
					set trackName to the name of selectedTrack
					set albumName to the album of selectedTrack
					set artistName to the artist of selectedTrack
					set trackDuration to the duration of selectedTrack
					set output to output & ${outputQuery} & "\n"
				end repeat
			end tell
		return output
	`);
};

export const play = (track: string) => tell("Music", `play track "${track}" of playlist 1`);
export const playById = (id: string) =>
  runScript(`
	tell application "Music"
		play (every track whose id is "${id}")
	end tell
`);

export const getArtworkByIds = async (ids: string[]) => {
  const result: any = {};
  const size = layout === "list" || ids.length > 10 ? imageSize : undefined;
  const promises = ids.map(async (id) => {
    const data = await runAppleScript(`
      tell application "Music"
        set trackArtwork to first artwork of first track of (every track whose id is ${id})
        set trackImage to data of trackArtwork
      end tell
      return trackImage
    `);
    result[id] = await parseImageStream(data, size);
  });
  await Promise.all(promises);
  return result;
};
