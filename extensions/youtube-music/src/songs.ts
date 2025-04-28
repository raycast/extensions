import { SearchDropdownList } from "./types";

export const filterNullItems = <T>(data: (T | null)[]) => {
  return data.filter((item) => item !== null);
};

export const TEXT_TRUCATE_LENGTH = 40;

export const searchDropdownList: SearchDropdownList[] = [
  {
    title: "All",
    value: "all",
  },
  {
    title: "Artists",
    value: "artists",
  },
  {
    title: "Songs",
    value: "songs",
  },
  {
    title: "Albums",
    value: "albums",
  },
  {
    title: "Videos",
    value: "videos",
  },
  {
    title: "Playlists",
    value: "playlists",
  },
];

/*
replace browser tab feature
*/

// const runJS = (browser: SupportedBrowsers | string, code: string): string => {
//   if (browser === "Safari") {
//     return `do javascript "${code}"`;
//   }
//   return `execute javascript "${code}"`;
// };

// export const runJSInYouTubeMusicTab = async (code: string) => {
//   const browser = getPreferenceValues<{ browser: Application }>().browser;

//   try {
//     const jsResult = await runAppleScript(`
// 		    tell application "${browser.name}"
// 		        repeat with w in (every window)
// 		            repeat with t in (every tab whose URL contains "music.youtube.com" or URL contains "youtube.com") of w
// 		              tell t
// 		                 return ${runJS(browser.name, code)}
// 		              end tell
// 		            end repeat
// 		        end repeat
// 		    end tell
// 		    return "false"
// 		`);

//     if (jsResult === "false") {
//       await showToast({
//         style: Toast.Style.Failure,
//         title: "YouTube Music tab was not found",
//         message: "Try to check selected browser in extension preferences.",
//       });

//       return false;
//     }

//     return jsResult;
//   } catch (e) {
//     const message = (e as OsaError).stderr;

//     if (message.includes("Allow JavaScript from Apple Events")) {
//       await showToast({
//         style: Toast.Style.Failure,
//         title: "Cannot run JavaScript in selected browser.",
//         message: `Enable the 'Allow JavaScript from Apple Events' option in ${browser.name}'s Develop menu.`,
//       });
//     }

//     return false;
//   }
// };
