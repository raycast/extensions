import { runAppleScript } from "run-applescript";
import { BunchesInfo, PreferencesInfo } from "../types/types";
import path from "path";

export const scriptToGetBunches = async () => {
  const script = `tell application "Bunch" to list bunches`;
  let bunches = "";
  try {
    bunches = await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
  return bunches;
};

export const scriptToGetOpenBunches = async () => {
  const script = `tell application "Bunch" to list open bunches`;
  let bunches = "";
  try {
    bunches = await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
  return bunches;
};

export const scriptToGetTaggedBunches = async (tag: string) => {
  const script = `tell application "Bunch" to list bunches tagged "${tag}"`;
  let bunches = "";
  try {
    bunches = await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
  return bunches;
};

export const scriptToToggleBunches = async (bunches: BunchesInfo) => {
  const script = `tell application "Bunch"
    toggle bunch "${bunches.name}"
end tell`;
  try {
    return await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};

export const scriptToProcessRawBunchText = async (text: string) => {
  const script = `tell application "Bunch"
    process text "${text}"
end tell`;
  try {
    return await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};

export const scriptToGetPreferences = async () => {
  const script1 = `tell application "Bunch"
   get preference "Bunch Folder" 
end tell`;
  const script2 = `tell application "Bunch"
   get preference "Toggle Bunches"
end tell`;
  const script3 = `tell application "Bunch"
   get preference "Single Bunch Mode"
end tell`;
  const script4 = `tell application "Bunch"
   get preference "Debug Level (0-4)"
end tell`;
  const script5 = `tell application "Bunch"
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
      value: parsedPath.dir + "/" + parsedPath.base,
    });
    preferences.push({ title: "Toggle Bunches", value: toggleBunches === "0" ? "On" : "Off" });
    preferences.push({ title: "Single Bunch Mode", value: singleBunchMode === "0" ? "On" : "Off" });
    preferences.push({ title: "Debug Level (0-4)", value: debugLeve });
    preferences.push({ title: "Preserve Bunches", value: preserveBunches });
  } catch (e) {
    console.error(String(e));
  }
  return preferences;
};

export const scriptToGetBunchFolder = async () => {
  const script1 = `tell application "Bunch"
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
  const script = `tell application "Bunch"
    refresh browsers
end tell`;
  try {
    return await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};

export const scriptToRefreshBrowsersByName = async (name: string) => {
  const script = `tell application "Bunch"
    refresh browsers for bunch "${name}"
end tell`;
  try {
    return await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};
