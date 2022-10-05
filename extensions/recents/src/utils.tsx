import { runAppleScript } from "run-applescript";

import { SpotlightResult } from "./types";

export const copyRecentToClipboard = (result: SpotlightResult) => {
  runAppleScript(`set the clipboard to POSIX file "${result.kMDItemPath}"`);
};
