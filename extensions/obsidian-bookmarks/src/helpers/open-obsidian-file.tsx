import path from "node:path";
import { URLSearchParams } from "node:url";

import { getPreferenceValues, open } from "@raycast/api";
import { Preferences } from "../types";

export function createObsidianUri(file: string, inBookmarks = true): string {
  const prefs = getPreferenceValues<Preferences>();
  const filePath = inBookmarks ? path.join(prefs.bookmarksPath, file) : file;

  const params = new URLSearchParams();
  params.set("vault", path.basename(prefs.vaultPath));
  params.set("file", filePath);
  return `obsidian://open?${params.toString().replaceAll("+", "%20")}`;
}

export default function openObsidianFile(file: string, inBookmarks = true): Promise<void> {
  const url = createObsidianUri(file, inBookmarks);
  console.log("Opening URL", url);
  return open(url);
}
