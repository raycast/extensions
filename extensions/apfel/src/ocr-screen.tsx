import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { checkAuge, runAugeOcr } from "./api/auge";

const execFileAsync = promisify(execFile);

export default async function Command() {
  if ((await checkAuge()) === "not_installed") {
    await showHUD("auge not installed — brew tap Arthur-Ficial/tap && brew install Arthur-Ficial/tap/auge");
    return;
  }

  await closeMainWindow();

  const tmpFile = join(tmpdir(), `auge-ocr-${Date.now()}.png`);

  // Brief pause after window close for macOS to transfer focus
  await new Promise<void>((resolve) => setTimeout(resolve, 200));

  try {
    // screencapture exits non-zero when Escape is pressed — treat as silent cancel
    await execFileAsync("/usr/sbin/screencapture", ["-i", tmpFile]);
  } catch {
    return;
  }

  // On some macOS versions screencapture exits 0 on Escape without writing a file
  if (!existsSync(tmpFile)) return;

  try {
    const text = await runAugeOcr({ type: "file", path: tmpFile });

    if (!text) {
      await showHUD("No text found in selected area");
      return;
    }

    await Clipboard.copy(text);
    await showHUD(`Copied ${text.length} characters to clipboard`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await showHUD(`OCR failed: ${message}`);
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore
    }
  }
}
