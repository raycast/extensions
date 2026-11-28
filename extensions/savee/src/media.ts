import { Clipboard, showInFinder, showToast, Toast } from "@raycast/api";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { showSaveeError } from "./errors";
import { getMediaExtension, getMediaFileName } from "./save-utils";
import { Save } from "./types";

async function fetchMedia(save: Save): Promise<{ buffer: Buffer; extension: string }> {
  const response = await fetch(save.media.original, { headers: { "Avif-Fallback": "1" } });
  if (!response.ok) {
    throw new Error("Couldn't download the " + save.media.type + " (" + response.status + ")");
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    extension: getMediaExtension(save.media.original, response.headers.get("Content-Type")),
  };
}

function uniquePath(directory: string, fileName: string): string {
  let candidate = join(directory, fileName);
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const extension = dot > 0 ? fileName.slice(dot) : "";

  for (let index = 2; existsSync(candidate); index += 1) {
    candidate = join(directory, base + " " + index + extension);
  }

  return candidate;
}

export async function copyMedia(save: Save): Promise<void> {
  const label = save.media.type === "video" ? "video" : "image";
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying " + label + "…" });

  try {
    const { buffer, extension } = await fetchMedia(save);
    const directory = join(tmpdir(), "raycast-savee");
    await mkdir(directory, { recursive: true });
    const file = join(directory, save.short_id + "." + extension);
    await writeFile(file, buffer);
    await Clipboard.copy({ file });
    toast.style = Toast.Style.Success;
    toast.title = "Copied " + label;
  } catch (error) {
    await toast.hide();
    await showSaveeError(error);
  }
}

export async function downloadMedia(save: Save): Promise<void> {
  const label = save.media.type === "video" ? "video" : "image";
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading " + label + "…" });

  try {
    const { buffer, extension } = await fetchMedia(save);
    const directory = join(homedir(), "Downloads");
    await mkdir(directory, { recursive: true });
    const file = uniquePath(directory, getMediaFileName(save, extension));
    await writeFile(file, buffer);
    toast.style = Toast.Style.Success;
    toast.title = "Downloaded " + label;
    toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(file) };
  } catch (error) {
    await toast.hide();
    await showSaveeError(error);
  }
}
