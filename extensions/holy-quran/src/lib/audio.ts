import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const LIBRARY_PATH = path.join(os.homedir(), "Music", "HolyQuran");
const VERSES_PATH = path.join(LIBRARY_PATH, ".verses"); // Hidden folder for verse caching
export const LOOP_SCRIPT = path.join(os.tmpdir(), "quran_audio_loop.sh");
export const REPEAT_FLAG_FILE = path.join(os.tmpdir(), "quran_repeat_flag");

async function isOffline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    await fetch("https://www.google.com", { method: "HEAD", signal: controller.signal, mode: "no-cors" });
    clearTimeout(timeout);
    return false;
  } catch {
    return true;
  }
}

export async function stopLoop(): Promise<void> {
  try {
    await execAsync(`pkill -9 -f "${LOOP_SCRIPT}" || true`);
  } catch {
    // ignore
  }
}

export async function stopAudio(): Promise<void> {
  try {
    await execAsync(`pkill -9 afplay || true; pkill -9 -f "${LOOP_SCRIPT}" || true`);
    if (fs.existsSync(REPEAT_FLAG_FILE)) fs.unlinkSync(REPEAT_FLAG_FILE);
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

export async function playAudio(
  url: string,
  reciterName: string,
  surahName: string,
  chapterId: number,
  shouldLoop: boolean = false,
): Promise<number> {
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

  const duration = await getAudioDuration(localFile);

  // Set the repeat flag
  fs.writeFileSync(REPEAT_FLAG_FILE, shouldLoop ? "true" : "false");

  // Create a loop script even for single playback to allow toggling repeat ON while playing
  const loopScript = `#!/bin/bash
while true; do
  afplay "$(printf '%q' "${localFile}")"
  if [ ! -f "${REPEAT_FLAG_FILE}" ] || [ "$(cat "${REPEAT_FLAG_FILE}")" != "true" ]; then
    break
  fi
done
`;

  fs.writeFileSync(LOOP_SCRIPT, loopScript, { mode: 0o755 });

  const child = spawn(LOOP_SCRIPT, [], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return duration;
}

export async function playVersePlaylist(
  verseItems: { url: string; verseKey: string }[],
  reciterName: string,
  repeatCount: number = 1, // 0 for infinite
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
      if (offline || !item.url) continue;
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
    if (offline) throw new Error("Offline and verses not cached.");
    throw new Error("Could not prepare verses.");
  }

  // Set the repeat flag
  const isInfinite = repeatCount === 0;
  fs.writeFileSync(REPEAT_FLAG_FILE, isInfinite ? "true" : "false");

  const loopScript = `#!/bin/bash
COUNT=0
ITERATIONS=${isInfinite ? 999999 : repeatCount || 1}
while [ $COUNT -lt $ITERATIONS ]; do
  ${localPaths.map((p) => `afplay "$(printf '%q' '${p}')"`).join("; ")}
  COUNT=$((COUNT+1))
  IF_FLAG=$(cat "$(printf '%q' '${REPEAT_FLAG_FILE}')" 2>/dev/null)
  if [ "$IF_FLAG" == "true" ]; then
    ITERATIONS=999999
  elif [ $COUNT -ge ${repeatCount || 1} ]; then
    break
  fi
done
`;

  fs.writeFileSync(LOOP_SCRIPT, loopScript, { mode: 0o755 });

  const child = spawn(LOOP_SCRIPT, [], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  const totalDuration = isInfinite ? 0 : totalSingleDuration * (repeatCount || 1);
  return totalDuration;
}
