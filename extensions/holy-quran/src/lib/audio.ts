import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const LIBRARY_PATH = path.join(os.homedir(), "Music", "HolyQuran");
const VERSES_PATH = path.join(LIBRARY_PATH, ".verses"); // Hidden folder for verse caching
const LOOP_SCRIPT = path.join(os.tmpdir(), "quran_audio_loop.sh");

export async function stopAudio(): Promise<void> {
  try {
    await execAsync(`pkill -9 afplay; pkill -f "${LOOP_SCRIPT}"`);
  } catch {
    // If no process is found, that's fine
  }
}

export async function pauseAudio(): Promise<void> {
  try {
    // Revert to STOP as it's more reliable for detached processes
    await execAsync(`pkill -STOP -f "${LOOP_SCRIPT}" || true; pkill -STOP afplay || true`);
  } catch {
    // If no process is found, that's fine
  }
}

export async function resumeAudio(): Promise<void> {
  try {
    await execAsync(`pkill -CONT -f "${LOOP_SCRIPT}" || true; pkill -CONT afplay || true`);
  } catch {
    // If no process is found, that's fine
  }
}

function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizePathSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[`'"]/g, "") // Remove quotes/apostrophes
    .replace(/[^a-z0-9]+/g, "_") // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, ""); // Trim underscores
}

export async function playAudio(url: string, reciterName: string, surahName: string): Promise<void> {
  await stopAudio();

  const reciterSlug = sanitizePathSegment(reciterName);
  const surahSlug = sanitizePathSegment(surahName);

  const reciterDir = path.join(LIBRARY_PATH, reciterSlug);
  ensureDirSync(reciterDir);

  const localFile = path.join(reciterDir, `${surahSlug}.mp3`);

  if (!fs.existsSync(localFile)) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(localFile, buffer);
  }

  // Play from the local file and detach so it keeps running after Raycast exits
  const child = spawn("afplay", [localFile], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export async function playVersePlaylist(
  verseItems: { url: string; verseKey: string }[],
  reciterName: string,
  repeatCount: number = 1,
): Promise<void> {
  await stopAudio();

  const reciterSlug = sanitizePathSegment(reciterName);
  const reciterVerseDir = path.join(VERSES_PATH, reciterSlug);
  ensureDirSync(reciterVerseDir);

  const localPaths: string[] = [];

  for (const item of verseItems) {
    const fileName = `${item.verseKey.replace(":", "_")}.mp3`;
    const localPath = path.join(reciterVerseDir, fileName);

    if (!fs.existsSync(localPath)) {
      const resp = await fetch(item.url);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        await fs.promises.writeFile(localPath, buf);
      }
    }

    if (fs.existsSync(localPath)) {
      localPaths.push(localPath);
    }
  }

  if (localPaths.length === 0) throw new Error("Could not prepare any verses for playback.");

  const playSequence = localPaths.map((p) => `afplay "${p}"`).join("; ");
  const iterations = repeatCount === 0 ? 9999 : repeatCount;

  const loopScript = `#!/bin/bash
for i in {1..${iterations}}; do
  ${playSequence}
done
`;

  fs.writeFileSync(LOOP_SCRIPT, loopScript, { mode: 0o755 });

  // Execute the script in the background and detach
  const child = spawn(LOOP_SCRIPT, [], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

