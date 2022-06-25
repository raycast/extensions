import { createQueryString, runScript, tell } from "../apple-script";

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

import { runAppleScript } from "run-applescript";
import resizeImg from "resize-image-buffer";

export const getArtworkByIds = async (ids: string[]) => {
  // const query = ids
  //   .slice(0, 40)
  //   .map((id) => `id is ${id}`)
  //   .join(" or ");
  // const start_time = new Date().getTime();
  // const res = await runAppleScript(`
  //   set output to {}
  //   tell application "Music"
  //     set results to (every track whose ${query})
  //     repeat with selectedTrack in results
  //       set trackArtwork to first artwork of selectedTrack
  //       set trackImage to data of trackArtwork
  //       set end of output to trackImage
  //     end repeat
  //   end tell
  //   return output
  // `);
  // const end_time = new Date().getTime();
  // console.log(`applescript took: ${end_time - start_time}ms`);
  // const promises = res.split(", ").map(async (data) => {
  //   let binary = null;
  //   try {
  //     const image_type = data.slice(6, 10);
  //     if (image_type == "JPEG") {
  //       binary = data.split("JPEG")[1].slice(0, -1);
  //       const image = Buffer.from(binary, "hex");
  //       // const resized = await resizeImg(image, { width: 128, height: 128 });
  //       return "data:image/jpeg;base64," + image.toString("base64");
  //     } else if (image_type == "tdta") {
  //       binary = data.split("tdta")[1].slice(0, -1);
  //       const image = Buffer.from(binary, "hex");
  //       // const resized = await resizeImg(image, { width: 128, height: 128 });
  //       return "data:image/png;base64," + image.toString("base64");
  //     }
  //   } catch (err: any) {
  //     console.log(err.message);
  //     return "";
  //   }
  // });
  // return Promise.all(promises);
  const result:any = {}
  const promises = ids.slice(0, 10).map(async (id) => {
    const res = await runAppleScript(`
      tell application "Music"
        set trackArtwork to first artwork of first track of (every track whose id is ${id})
        set trackImage to data of trackArtwork
      end tell
      return trackImage
    `);
    let binary = null
    try {
      const image_type = res.slice(6, 10);
      if (image_type == "JPEG") {
        binary = res.split("JPEG")[1].slice(0, -1);
        const image = Buffer.from(binary, "hex");
        // const resized = await resizeImg(image, { width: 128, height: 128 });
        result[id] = "data:image/jpeg;base64," + image.toString("base64");
      }
      else if (image_type == "tdta") {
        binary = res.split("tdta")[1].slice(0, -1);
        const image = Buffer.from(binary, "hex");
        // const resized = await resizeImg(image, { width: 128, height: 128 });
        result[id] = "data:image/png;base64," + image.toString("base64");
      }
    }
    catch (err) {
      console.log(res.slice(0, 20))
      console.log(id)
      result[id] = "";
    }
  });
  await Promise.all(promises);
  return result
};
