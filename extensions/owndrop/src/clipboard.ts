import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Clipboard, environment } from "@raycast/api";
import { runAppleScript, runPowerShellScript } from "@raycast/utils";
import { downloadDropForClipboard, getImagePreview, type DropItem } from "./api";
import { getDropKind } from "./content";

const run = promisify(execFile);

export async function copyDrop(item: DropItem): Promise<void> {
  if (item.type === "text") {
    await Clipboard.copy(item.text ?? "");
    return;
  }
  if (getDropKind(item) !== "image") {
    await Clipboard.copy({ file: await downloadDropForClipboard(item) });
    return;
  }

  // Reuse the authenticated preview cache, including when the pane already loaded it.
  const localPath = item.size <= 20 * 1024 * 1024 ? await getImagePreview(item) : await downloadDropForClipboard(item);

  if (process.platform === "win32") {
    const script = await fs.readFile(path.join(environment.assetsPath, "copy-image-windows.ps1"), "utf8");
    const escapedPath = localPath.replace(/'/g, "''");
    try {
      await runPowerShellScript(`$env:OWNDROP_CLIPBOARD_IMAGE_PATH = '${escapedPath}'\n${script}`, {
        timeout: 20000,
      });
    } catch {
      throw new Error("Could not copy this image. Use Download to Downloads instead.");
    }
    return;
  }

  if (process.platform === "darwin") {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "owndrop-image-"));
    const png = path.join(directory, "image.png");
    await run("/usr/bin/sips", ["-s", "format", "png", localPath, "--out", png], { timeout: 20000 });
    await runAppleScript(
      "on run argv\nset imageFile to POSIX file (item 1 of argv)\nset the clipboard to (read imageFile as «class PNGf»)\nend run",
      [png],
      { timeout: 20000 },
    );
    return;
  }
  throw new Error("Image clipboard is not supported on this platform. Use Download to Downloads instead.");
}
