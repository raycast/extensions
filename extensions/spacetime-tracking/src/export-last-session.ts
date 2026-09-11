import { showHUD } from "@raycast/api";
import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { getSessions } from "./lib/storage";
import { sessionCsvFilename, sessionToCsv } from "./lib/csv";
import { promptSaveLocation } from "./lib/dialog";

export default async function Command() {
  const all = await getSessions();
  if (all.length === 0) {
    await showHUD("No session to export");
    return;
  }
  const last = [...all].sort((a, b) => b.startedAt - a.startedAt)[0];

  const path = await promptSaveLocation(sessionCsvFilename(last), join(homedir(), "Downloads"));
  if (!path) {
    await showHUD("Export cancelled");
    return;
  }

  try {
    writeFileSync(path, sessionToCsv(last), "utf8");
    await showHUD(`Exported “${last.name}” to ${path}`);
  } catch (err) {
    await showHUD(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
