import {
  Clipboard,
  closeMainWindow,
  environment,
  getSelectedText,
  showHUD,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { preparePlayer } from "./player";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const run = promisify(execFile);

export default async function command() {
  try {
    const selection = await getSelectedText().catch(() => "");
    const selected = Boolean(selection.trim());
    const text = selected ? selection : await Clipboard.readText();
    if (!text?.trim()) {
      await showHUD("Select some text or copy it to the clipboard first");
      return;
    }
    const app = await preparePlayer();
    const dir = await mkdtemp(join(environment.supportPath, "reading-"));
    try {
      const file = join(dir, selected ? "Selection.txt" : "Clipboard.txt");
      await writeFile(file, text, { mode: 0o600 });
      await closeMainWindow();
      await run("/usr/bin/open", ["-a", app, file]);
    } catch (error) {
      await rm(dir, { recursive: true, force: true });
      throw error;
    }
  } catch (error) {
    await showHUD(
      error instanceof Error
        ? error.message
        : "Could not open the speech player",
    );
  }
}
