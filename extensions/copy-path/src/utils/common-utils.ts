import { runAppleScript } from "run-applescript";
import { scriptFinderPath } from "./constants";

//with / at the end
export const getFocusFinderPath = async () => {
  try {
    return await runAppleScript(scriptFinderPath);
  } catch (e) {
    return "Finder not running";
  }
};
