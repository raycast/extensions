import { showToast, Toast, open } from "@raycast/api";
import fs from "fs";
import path from "path";
import { unescapeHTML } from "./formatters";
import { TorrentItem } from "../types";
import { FILENAME_FORBIDDEN_CHARS } from "./constants";

export async function handleDownloadAction(item: TorrentItem, targetDir: string) {
  if (!item.link) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading..." });

  try {
    const response = await fetch(item.link);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    if (response.headers.get("content-type")?.includes("text/html")) throw new Error("RSS Authentication failed.");

    const buffer = Buffer.from(await response.arrayBuffer());
    const torrentId = new URL(item.link).searchParams.get("id") || "torrent";

    let safeTitle = unescapeHTML(item.title || "")
      .replace(FILENAME_FORBIDDEN_CHARS, "-")
      .replace(/\s+/g, " ")
      .trim();

    if (safeTitle.length > 200) {
      safeTitle = safeTitle.substring(0, 200);
    }

    if (!safeTitle) {
      safeTitle = `torrent_${torrentId}`;
    }

    const filePath = path.join(targetDir, `${safeTitle}.torrent`);

    fs.writeFileSync(filePath, buffer);
    toast.style = Toast.Style.Success;
    toast.title = "Success!";
    await open(filePath);
  } catch (error: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download Error";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
