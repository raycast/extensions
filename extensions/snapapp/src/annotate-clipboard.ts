import { Clipboard, environment, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isImage, openInSnapApp, requireSnapApp, runCommand } from "./snapapp";

// Writes the clipboard's image to `base` + .png (or .tiff when only TIFF is on it) and returns
// that file, or an empty string when the clipboard holds no image.
const WRITE_CLIPBOARD_IMAGE = `
on run argv
  set base to item 1 of argv
  try
    set imageData to the clipboard as «class PNGf»
    set target to base & ".png"
  on error
    try
      set imageData to the clipboard as «class TIFF»
      set target to base & ".tiff"
    on error
      return ""
    end try
  end try
  set handle to open for access (POSIX file target) with write permission
  try
    set eof handle to 0
    write imageData to handle
    close access handle
  on error message
    close access handle
    error message
  end try
  return target
end run`;

// Clipboard images are written here for SnapApp to open; a day later they are removed.
async function clearOldImages(folder: string): Promise<void> {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const name of await readdir(folder)) {
    const path = join(folder, name);
    try {
      if ((await stat(path)).mtimeMs < dayAgo) await rm(path, { force: true });
    } catch {
      // Already gone.
    }
  }
}

export default async function Command() {
  await runCommand("Could not open the clipboard image", async () => {
    const app = await requireSnapApp();
    if (!app) return;
    const { file } = await Clipboard.read();
    if (file) {
      const path = file.startsWith("file://") ? fileURLToPath(file) : file;
      if (isImage(path)) {
        await openInSnapApp(app, [path]);
        return;
      }
    }
    const folder = join(environment.supportPath, "clipboard");
    await mkdir(folder, { recursive: true });
    await clearOldImages(folder);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const written = await runAppleScript(WRITE_CLIPBOARD_IMAGE, [join(folder, `Clipboard ${stamp}`)]);
    if (!written) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image on the clipboard",
        message: "Copy a screenshot or an image first.",
      });
      return;
    }
    await openInSnapApp(app, [written]);
  });
}
