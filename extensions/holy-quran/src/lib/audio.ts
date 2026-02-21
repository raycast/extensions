import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const LIBRARY_PATH = path.join(os.homedir(), "Music", "HolyQuran");
const VERSES_PATH = path.join(LIBRARY_PATH, ".verses"); // Hidden folder for verse caching
const LOOP_SCRIPT = path.join(os.tmpdir(), "quran_audio_loop.sh");

async function isOffline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    await fetch("https://www.google.com", { method: "HEAD", signal: controller.signal, mode: 'no-cors' });
    clearTimeout(timeout);
    return false;
  } catch {
    return true;
  }
}

export async function stopAudio(): Promise<void> {
  try {
    await execAsync(`pkill -9 afplay || true; pkill -9 -f "${LOOP_SCRIPT}" || true`);
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

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`afinfo "${filePath}"`);
    const match = stdout.match(/estimated duration: (\d+\.?\d*) sec/);
    return match ? parseFloat(match[1]) : 0;
  } catch (e) {
    console.error("Failed to get audio duration:", e);
    return 0;
  }
}

export function getSurahPath(reciterName: string, surahName: string, chapterId: number): string {
  const reciterSlug = sanitizePathSegment(reciterName);
  const surahSlug = sanitizePathSegment(surahName);
  const paddedId = chapterId.toString().padStart(3, "0");
  return path.join(LIBRARY_PATH, reciterSlug, `${paddedId}_${surahSlug}.mp3`);
}

export function getVersePath(reciterName: string, verseKey: string): string {
  const reciterSlug = sanitizePathSegment(reciterName);
  return path.join(VERSES_PATH, reciterSlug, `${verseKey.replace(":", "_")}.mp3`);
}

export function isSurahCached(reciterName: string, surahName: string, chapterId: number): boolean {
  return fs.existsSync(getSurahPath(reciterName, surahName, chapterId));
}

export function isVerseRangeCached(reciterName: string, chapterId: number, start: number, end: number): boolean {
  for (let i = start; i <= end; i++) {
    const verseKey = `${chapterId}:${i}`;
    if (!fs.existsSync(getVersePath(reciterName, verseKey))) {
      return false;
    }
  }
  return true;
}

export async function playAudio(url: string, reciterName: string, surahName: string, chapterId: number): Promise<number> {
  await stopAudio();

  const localFile = getSurahPath(reciterName, surahName, chapterId);
  const reciterDir = path.dirname(localFile);
  ensureDirSync(reciterDir);

  if (!fs.existsSync(localFile)) {
    if (await isOffline()) {
      throw new Error("You are offline. Please connect to the internet to download this Surah for the first time.");
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(localFile, buffer);
  }

  // Get duration before playing
  const duration = await getAudioDuration(localFile);

  // Play from the local file and detach so it keeps running after Raycast exits
  const child = spawn("afplay", [localFile], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return duration;
}

export async function playVersePlaylist(
  verseItems: { url: string; verseKey: string }[],
  reciterName: string,
  repeatCount: number = 1,
): Promise<number> {
  await stopAudio();

  const reciterSlug = sanitizePathSegment(reciterName);
  const reciterVerseDir = path.join(VERSES_PATH, reciterSlug);
  ensureDirSync(reciterVerseDir);

  const localPaths: string[] = [];
  let totalSingleDuration = 0;

  const offline = await isOffline();

  for (const item of verseItems) {
    const fileName = `${item.verseKey.replace(":", "_")}.mp3`;
    const localPath = path.join(reciterVerseDir, fileName);

    if (!fs.existsSync(localPath)) {
      if (offline || !item.url) {
        continue; // Skip verses not in cache when offline or if no URL provided
      }
      const resp = await fetch(item.url);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        await fs.promises.writeFile(localPath, buf);
      }
    }

    if (fs.existsSync(localPath)) {
      localPaths.push(localPath);
      totalSingleDuration += await getAudioDuration(localPath);
    }
  }

  if (localPaths.length === 0) {
    if (offline) {
      throw new Error("You are offline and these verses are not in your library. Please connect to download them.");
    }
    throw new Error("Could not prepare any verses for playback.");
  }

  const playSequence = localPaths.map((p) => `afplay "${p}"`).join("; ");
  const iterations = repeatCount === 0 ? 9999 : repeatCount;
  const totalDuration = iterations === 9999 ? 0 : totalSingleDuration * iterations;

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

  return totalDuration;
}
