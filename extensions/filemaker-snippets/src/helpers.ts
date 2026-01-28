import bPlistParser from "bplist-parser";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "os";
import { existsSync } from "fs";

export type ParsedFilePath =
  | {
      id: string;
      local: true;
      exists: boolean;
      raw: string;
      path: string;
      locationName: string;
      fileName: string;
    }
  | { id: string; local: false; raw: string; host: string; locationName: string; fileName: string };

function parseFilePath(raw: string): ParsedFilePath {
  const local = raw.startsWith("file");
  const split = raw.split("/");
  const host = local ? "/" + split.slice(2, split.length).join("/") : split[1];
  const locationName = local ? "Local" : split[2];

  // filename is the last part of the path
  const fileName = split[split.length - 1].replace(".fmp12", "");

  return {
    ...(local ? { local, path: host, exists: existsSync(host) } : { local, host }),
    raw,
    locationName: local ? host : locationName,
    fileName,
    id: raw,
  };
}

type FileMakerPrefs = { recentFiles: ParsedFilePath[]; favorites: ParsedFilePath[]; exists: boolean };

async function readPlist(): Promise<FileMakerPrefs> {
  const filepath = `${homedir()}/Library/Preferences/com.filemaker.client.pro12.plist`;
  if (!existsSync(filepath)) return { exists: false, recentFiles: [], favorites: [] };

  const plistValues = (await bPlistParser.parseFile(filepath)) as [Record<string, string>];
  const obj = plistValues[0];

  const data = Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (value === "") {
        return acc;
      } else if (key.startsWith("Launch_Center_Recent File List:")) {
        acc.recentFiles.push(parseFilePath(value));
      } else if (key.startsWith("Launch_Center_Favorites:")) {
        acc.favorites.push(parseFilePath(value));
      }
      return acc;
    },
    { favorites: [], recentFiles: [] } as Omit<FileMakerPrefs, "exists">
  );

  return { ...data, exists: true };
}

export function useFileMakerPrefs() {
  const qr = useCachedPromise(readPlist, [], {});
  return qr;
}
