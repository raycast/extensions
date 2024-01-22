import bPlistParser from "bplist-parser";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "os";

export type ParsedFilePath =
  | { local: false; raw: string; host: string; locationName: string; fileName: string }
  | {
      local: true;
      raw: string;
      path: string;
      locationName: string;
      fileName: string;
    };

function parseFilePath(raw: string): ParsedFilePath {
  const local = raw.startsWith("file");
  const split = raw.split("/");
  const host = local ? "/" + split.slice(2, split.length).join("/") : split[1];
  const locationName = local ? "Local" : split[2];

  // filename is the last part of the path
  const fileName = split[split.length - 1];

  return {
    ...(local ? { local, path: host } : { local, host }),
    raw,
    locationName: local ? host : locationName,
    fileName,
  };
}

async function readPlist() {
  const filepath = `${homedir()}/Library/Preferences/com.filemaker.client.pro12.plist`;
  console.log(filepath);

  const plistValues = (await bPlistParser.parseFile(filepath)) as [Record<string, string>];
  const obj = plistValues[0];

  const data = Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (key.startsWith("Launch_Center_Recent File List:")) {
        acc.recentFiles.push(parseFilePath(value));
      } else if (key.startsWith("Launch_Center_Favorites:")) {
        acc.favorites.push(parseFilePath(value));
      }
      return acc;
    },
    { recentFiles: [] as ParsedFilePath[], favorites: [] as ParsedFilePath[] },
  );

  return data;
}

export function useFileMakerPrefs() {
  const qr = useCachedPromise(readPlist, [], {});
  return qr;
}
