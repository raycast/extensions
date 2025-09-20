import { PreferencesInfo } from "../types/types";
import path from "path";
import { bunchAppName, isEmpty } from "./common-utils";
import { runAppleScript } from "@raycast/utils";

export const scriptToGetBunches = async () => {
  const script = `tell application "${bunchAppName()}" to list bunches`;
  try {
    const bunchesStr = await runAppleScript(script);
    if (!isEmpty(bunchesStr)) {
      return bunchesStr.split(", ");
    }
  } catch (e) {
    console.error(String(e));
  }
  return [];
};

export const scriptToGetOpenBunches = async () => {
  const script = `tell application "${bunchAppName()}" to list open bunches`;
  try {
    const bunchesStr = await runAppleScript(script);
    if (!isEmpty(bunchesStr)) {
      return bunchesStr.split(", ");
    }
  } catch (e) {
    console.error(String(e));
  }
  return [];
};

export const scriptToGetTaggedBunches = async (tag: string) => {
  const script = `tell application "${bunchAppName()}" to list bunches tagged "${tag}"`;
  let bunches = "";
  try {
    bunches = await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
  return bunches;
};

export const scriptToGetPreferences = async () => {
  const script1 = `tell application "${bunchAppName()}"
   get preference "Bunch Folder" 
end tell`;
  const script2 = `tell application "${bunchAppName()}"
   get preference "Toggle Bunches"
end tell`;
  const script3 = `tell application "${bunchAppName()}"
   get preference "Single Bunch Mode"
end tell`;
  const script4 = `tell application "${bunchAppName()}"
   get preference "Debug Level (0-4)"
end tell`;
  const script5 = `tell application "${bunchAppName()}"
   get preference "Preserve Bunches"
end tell`;
  const preferences: PreferencesInfo[] = [];
  try {
    const bunchFolder = await runAppleScript(script1);
    const toggleBunches = await runAppleScript(script2);
    const singleBunchMode = await runAppleScript(script3);
    const debugLeve = await runAppleScript(script4);
    const preserveBunches = await runAppleScript(script5);
    const parsedPath = path.parse(bunchFolder.startsWith("file://") ? bunchFolder.substring(7) : bunchFolder);
    preferences.push({
      title: "Bunch Folder",
      subtitle: parsedPath.dir + "/" + parsedPath.base,
      value: bunchFolder,
    });
    preferences.push({
      title: "Toggle Bunches",
      subtitle: toggleBunches === "0" ? "Off" : "On",
      value: toggleBunches,
    });
    preferences.push({
      title: "Single Bunch Mode",
      subtitle: singleBunchMode === "0" ? "Off" : "On",
      value: singleBunchMode,
    });
    preferences.push({
      title: "Remember Open Bunches",
      subtitle: preserveBunches === "0" ? "Off" : "On",
      value: preserveBunches,
    });
    preferences.push({ title: "Debug Level (0-4)", subtitle: debugLeve, value: debugLeve });
  } catch (e) {
    console.error(String(e));
  }
  return preferences;
};

export const scriptToGetBunchFolder = async () => {
  const script1 = `tell application "${bunchAppName()}"
   get preference "Bunch Folder" 
end tell`;
  try {
    const bunchFolder = await runAppleScript(script1);
    const parsedPath = path.parse(bunchFolder.startsWith("file://") ? bunchFolder.substring(7) : bunchFolder);
    return parsedPath.dir + "/" + parsedPath.base;
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};

export const scriptToRefreshBrowsers = async () => {
  const script = `tell application "${bunchAppName()}"
    refresh browsers
end tell`;
  try {
    return await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};
