import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  getPreferenceValues,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { safeFetch } from "./network";
import type { Episode } from "./types";

const extensions: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/ogg": ".ogg",
  "audio/flac": ".flac",
  "audio/wav": ".wav",
};

export async function downloadEpisode(episode: Episode): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading episode",
    message: episode.title,
  });
  try {
    const response = await safeFetch(episode.enclosureUrl);
    if (!response.ok)
      throw new Error(`${response.status} ${response.statusText}`);
    const preferences = getPreferenceValues<Preferences>();
    const folder = expandHome(preferences.downloadDirectory || "~/Downloads");
    await fs.mkdir(folder, { recursive: true });
    const filename = `${sanitize(episode.feedTitle ? `${episode.feedTitle} - ${episode.title}` : episode.title)}${extension(episode, response)}`;
    const target = await uniquePath(folder, filename);
    if (!response.body)
      throw new Error("The download response did not contain audio data.");
    try {
      await pipeline(
        Readable.fromWeb(
          response.body as Parameters<typeof Readable.fromWeb>[0],
        ),
        createWriteStream(target, { flags: "wx" }),
      );
    } catch (error) {
      await fs.rm(target, { force: true });
      throw error;
    }
    toast.style = Toast.Style.Success;
    toast.title = "Episode downloaded";
    toast.message = target;
    toast.primaryAction = {
      title: "Show Download",
      onAction: () => showInFinder(target),
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function extension(episode: Episode, response: Response): string {
  const pathname = new URL(response.url || episode.enclosureUrl).pathname;
  const ext = path.extname(pathname).toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(ext)) return ext;
  return (
    extensions[
      response.headers.get("content-type")?.split(";")[0] ??
        episode.enclosureType ??
        ""
    ] ?? ".mp3"
  );
}
function sanitize(value: string): string {
  return (
    value
      .split("")
      .filter((character) => character.charCodeAt(0) >= 32)
      .join("")
      .replaceAll("/", "-")
      .replace(/[\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180) || "podcast-episode"
  );
}
function expandHome(value: string): string {
  return value === "~"
    ? os.homedir()
    : value.startsWith("~/")
      ? path.join(os.homedir(), value.slice(2))
      : value;
}
async function uniquePath(folder: string, filename: string): Promise<string> {
  const extension = path.extname(filename);
  const basename = path.basename(filename, extension);
  for (let index = 0; ; index += 1) {
    const candidate = path.join(
      folder,
      index === 0 ? filename : `${basename} (${index})${extension}`,
    );
    try {
      await fs.access(candidate);
    } catch {
      return candidate;
    }
  }
}
