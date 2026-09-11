import { Clipboard, Toast, getPreferenceValues, open, openExtensionPreferences, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync, lstatSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

import {
  downloadVideo,
  ensureUniquePath,
  fetchTweetVideos,
  formatFilename,
  parseTweetUrl,
  todayIso,
} from "./lib/twitter";

export default async function DownloadFromClipboard() {
  const prefs = getPreferenceValues<Preferences>();
  const downloadFolder = resolveFolder(prefs.downloadFolder);

  if (!isUsableDirectory(downloadFolder)) {
    await showFailureToast(`"${downloadFolder}" is not a valid directory.`, {
      title: "Invalid download folder",
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }

  const clipboardText = await Clipboard.readText();
  const parsed = parseTweetUrl(clipboardText);
  if (!parsed) {
    await showFailureToast("Copy an X/Twitter status URL first.", {
      title: "No tweet URL on clipboard",
    });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Resolving tweet…" });
  try {
    const videos = await fetchTweetVideos(parsed);
    if (videos.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "No videos in this tweet";
      return;
    }

    const targets = prefs.downloadAllMedia ? videos : videos.slice(0, 1);
    const filenameTemplate = prefs.filenameTemplate || "{username}_{tweetId}";
    const templateHasIndex = filenameTemplate.includes("{index}");
    const written: string[] = [];

    for (let i = 0; i < targets.length; i++) {
      const filename = formatFilename(filenameTemplate, {
        username: parsed.username,
        tweetId: parsed.tweetId,
        index: i + 1,
        date: todayIso(),
      });
      const suffix = targets.length > 1 && !templateHasIndex ? `_${i + 1}` : "";
      const destination = ensureUniquePath(resolve(downloadFolder, `${filename}${suffix}.mp4`));

      toast.title = targets.length > 1 ? `Downloading ${i + 1}/${targets.length}…` : "Downloading…";
      await downloadVideo(targets[i], destination, (fraction) => {
        toast.message = `${Math.round(fraction * 100)}%`;
      });
      written.push(destination);
    }

    const lastFile = written[written.length - 1];
    toast.style = Toast.Style.Success;
    toast.title = written.length > 1 ? `Downloaded ${written.length} videos` : "Download complete";
    toast.message = "";
    toast.primaryAction = {
      title: "Show in Finder",
      onAction: () => open(downloadFolder),
    };
    toast.secondaryAction = {
      title: "Open Video",
      onAction: () => open(lastFile),
    };
  } catch (error) {
    await showFailureToast(error, { title: "Download failed" });
    await toast.hide();
  }
}

function resolveFolder(preference: string | undefined): string {
  const value = preference?.trim();
  if (!value) return resolve(homedir(), "Downloads");
  if (value.startsWith("~")) return resolve(homedir(), value.slice(1).replace(/^[\\/]+/, ""));
  return value;
}

function isUsableDirectory(path: string): boolean {
  try {
    return existsSync(path) && lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}
