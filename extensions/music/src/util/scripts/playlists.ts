import * as TE from "fp-ts/TaskEither";
import { tell, runScript, createQueryString } from "../apple-script";

const outputQuery = createQueryString({
  id: "pId",
  name: "pName",
  duration: "pDuration",
  count: "pCount",
});

const loopThroughPlaylists = (type: "subscription" | "user") => `
	repeat with selectedPlaylist in ${type} playlists
		set pId to the id of selectedPlaylist
		set pName to the name of selectedPlaylist
		set pDuration to the duration of selectedPlaylist
		set pCount to count (tracks of selectedPlaylist)
		set output to output & ${outputQuery} & "\n"
    end repeat
`;

export const play = (name: string): TE.TaskEither<Error, string> => tell("Music", `play playlist "${name.trim()}"`);

export const getPlaylists: TE.TaskEither<Error, string> = runScript(`
	set output to ""
        tell application "Music"
        	${loopThroughPlaylists("subscription")}
			${loopThroughPlaylists("user")}
        end tell
	return output
`);
