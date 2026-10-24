import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";

import {
  BrowserExtension,
  Toast,
  environment,
  getPreferenceValues,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";

import { screenshotFolder } from "./folder.ts";
import { renderPost, type Theme } from "./render.ts";

const run = promisify(execFile);

const POST_URL = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([^/?#]+)\/status\/(\d+)/;
const COPY_IMAGE = [
  "-e",
  "on run argv",
  "-e",
  "set the clipboard to (read (POSIX file (item 1 of argv)) as «class PNGf»)",
  "-e",
  "end run",
];

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

export default async function main() {
  const { theme, saveFolder, closeOnSuccess } = getPreferenceValues<Preferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Reading X post" });

  try {
    if (!environment.canAccess(BrowserExtension)) {
      throw new Error("Install Raycast's browser extension, then try again.");
    }
    // `active` is per window, so only the focused window's page (getContent without tabId) tells which candidate is current.
    const html = await BrowserExtension.getContent({ format: "html" });
    const candidates = (await BrowserExtension.getTabs()).flatMap((t) => {
      const m = t.active ? POST_URL.exec(t.url) : null;
      return m ? [{ handle: m[1], id: m[2], hits: html.split(`/status/${m[2]}`).length - 1 }] : [];
    });
    const post = candidates.filter((c) => c.hits > 0).sort((a, b) => b.hits - a.hits)[0];
    if (!post) throw new Error("The active browser tab is not an X post.");
    const { handle, id } = post;
    if (!html.includes("<article")) throw new Error("No post found on the page yet. Wait for it to load.");

    toast.title = "Rendering screenshot";
    const png = await renderPost(html, theme as Theme, id, join(environment.assetsPath, "render.js"));

    toast.title = "Saving screenshot";
    const folder = screenshotFolder(saveFolder);
    const file = join(folder, `hw_raycast_xscreenshot_${timestamp()}_${handle}_${id}.png`);
    await mkdir(folder, { recursive: true });
    await writeFile(file, png);
    await run("osascript", [...COPY_IMAGE, file]);

    if (closeOnSuccess) {
      await showHUD(`Screenshot copied - saved in ${basename(folder)}`);
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Screenshot copied";
      toast.message = `Saved in ${basename(folder)}`;
      toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(file) };
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Screenshot failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
