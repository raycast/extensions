import { environment, getPreferenceValues } from "@raycast/api";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { speak as openReader } from "swift:../swift/SpeakReader";

/** The reader window runs as a separate process with this name. */
const READER_PROCESS = "SpeakReader";

/** True while the floating reader window is open. */
export function isReading(): boolean {
  try {
    execFileSync("/usr/bin/pgrep", ["-x", READER_PROCESS]);
    return true;
  } catch {
    return false;
  }
}

/** Closes the reader (it fades out). Returns false if nothing was reading. */
export function stopReading(): boolean {
  if (!isReading()) return false;
  try {
    execFileSync("/usr/bin/pkill", ["-x", READER_PROCESS]);
  } catch {
    // already gone
  }
  return true;
}

/** Closes any open reader and waits (up to ~3s) for it to exit. */
export async function stopReadingAndWait(): Promise<void> {
  if (!stopReading()) return;
  for (let i = 0; i < 30 && isReading(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Opens the floating reader and starts speaking `text`. */
export async function speak(text: string): Promise<void> {
  // Hand the text over in a private file (it can be far longer than a command-line argument).
  // The reader deletes it when it closes.
  const dir = path.join(environment.supportPath, "queue");
  fs.mkdirSync(dir, { recursive: true });
  // If an earlier reader crashed or the Mac shut down mid-read, its text file was never removed.
  // No reader is running at this point, so anything left in the queue is stale: clear it.
  if (!isReading()) {
    for (const name of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, name), { force: true, recursive: true });
    }
  }
  const file = path.join(dir, `text-${Date.now()}.txt`);
  fs.writeFileSync(file, text, { encoding: "utf8", mode: 0o600 });

  const { voice, tableHeaders } = getPreferenceValues<Preferences>();
  try {
    await openReader(file, voice || "auto", "+0%", tableHeaders ?? false);
  } catch (error) {
    fs.rmSync(file, { force: true });
    throw error;
  }
}
