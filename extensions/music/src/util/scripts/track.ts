import { createQueryString, runScript, tell } from "../apple-script";
import { runAppleScript } from "run-applescript";
import { getViewLayout, getImageSize } from "../listorgrid";
import { parseImageStream } from "../artwork";
import { Size } from "../artwork";

const layoutType = getViewLayout();

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
					set trackId to the database ID of selectedTrack
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
		play (every track whose database ID is "${id}")
	end tell
`);

export const getArtwork = async (id: string, size?: Size) => {
  const data = await runAppleScript(`
    tell application "Music"
      set trackArtwork to first artwork of first track of (every track whose database ID is ${id})
      set trackImage to data of trackArtwork
    end tell
    return trackImage
  `);
  return await parseImageStream(data, size);
};

export const getArtworkByIds = async (ids: string[], overrideLayout?: string) => {
  const result: any = {};
  const layout = overrideLayout || layoutType;
  const imageSize = getImageSize(layout);
  const size = layout === "list" || ids.length > 10 ? imageSize : undefined;
  const promises = ids.map(async (id) => {
    try {
      result[id] = await getArtwork(id, size);
    } catch {
      result[id] = "../assets/no-track.png";
    }
  });
  await Promise.all(promises);
  return result;
};

export const getTrackDetails = async (id: string) => {
  const outputQuery = createQueryString({
    name: "trackName",
    artist: "artistName",
    album: "albumName",
    duration: "trackDuration",
    time: "trackTime",
    genre: "trackGenre",
    playCount: "playCount",
    loved: "trackLoved",
    year: "trackYear",
  });

  return runAppleScript(`
    set output to ""
    tell application "Music"
      set myTrack to first track of (every track whose database ID is "${id}")
      set trackName to the name of myTrack
      set albumName to the album of myTrack
      set artistName to the artist of myTrack
      set trackDuration to the duration of myTrack
      set trackTime to the time of myTrack
      set trackGenre to the genre of myTrack
      set playCount to the played count of myTrack
      set trackLoved to the loved of myTrack
      set trackYear to the year of myTrack
      set output to output & ${outputQuery} & "\n"
    end tell
    return output
  `);
};
