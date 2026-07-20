import { Clipboard, Toast, environment, showInFinder, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { homedir } from "os";
import { Gif } from "./klipy";

function safeName(gif: Gif): string {
  const base = gif.title
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "tenor-gif"}-${gif.id}.gif`;
}

async function fetchGifBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Copy the actual GIF file to the clipboard so it can be pasted into apps. */
export async function copyGifFile(gif: Gif): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying GIF file..." });
  try {
    const buffer = await fetchGifBuffer(gif.gifUrl);
    const dir = join(environment.supportPath, "clipboard");
    await mkdir(dir, { recursive: true });
    const path = join(dir, safeName(gif));
    await writeFile(path, buffer);
    await Clipboard.copy({ file: path });
    toast.style = Toast.Style.Success;
    toast.title = "GIF file copied";
    toast.message = "Paste it into any app that accepts files.";
  } catch (error) {
    await showFailureToast(error, { title: "Could not copy GIF file" });
  }
}

/** Save the GIF to the user's Downloads folder. */
export async function downloadGif(gif: Gif): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading GIF..." });
  try {
    const buffer = await fetchGifBuffer(gif.gifUrl);
    const path = join(homedir(), "Downloads", safeName(gif));
    await writeFile(path, buffer);
    toast.style = Toast.Style.Success;
    toast.title = "Saved to Downloads";
    toast.message = safeName(gif);
    toast.primaryAction = {
      title: "Show in Finder",
      onAction: () => {
        void showInFinder(path);
      },
    };
  } catch (error) {
    await showFailureToast(error, { title: "Could not download GIF" });
  }
}
