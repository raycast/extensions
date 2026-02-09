import { exec, ChildProcess } from "child_process";
import { writeFile, unlink, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import * as os from "os";

const isWindows = process.platform === "win32";

let currentProcess: ChildProcess | null = null;
/** Prevents concurrent playSound() calls so the sound only plays once. */
let playSoundInProgress = false;
/** Debounce background plays so rapid invocations (e.g. double-press) only play once. */
const BACKGROUND_PLAY_DEBOUNCE_MS = 1500;
let lastBackgroundPlayTime = 0;

const TEMP_DIR = path.join(os.tmpdir(), "raycast-instants");

async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

export function stopCurrentSound() {
  if (currentProcess) {
    currentProcess.kill();
    currentProcess = null;
  }
}

function isUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

/**
 * Resolve to a local file path: if input is a URL, download to temp and return path; otherwise return as-is if it exists.
 */
async function resolveToFilePath(urlOrPath: string): Promise<string> {
  if (isUrl(urlOrPath)) {
    await ensureTempDir();
    const tempFile = path.join(TEMP_DIR, `sound-${Date.now()}.mp3`);
    const response = await fetch(urlOrPath);
    if (!response.ok) {
      throw new Error(`Failed to download sound: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(tempFile, buffer);
    return tempFile;
  }
  if (existsSync(urlOrPath)) {
    return urlOrPath;
  }
  throw new Error("File not found: " + urlOrPath);
}

/** Escape path for use in shell (double-quote escaping). */
function escapePath(filePath: string): string {
  return filePath.replace(/"/g, '\\"');
}

/**
 * Play a sound and resolve when playback finishes (foreground).
 * Stops any currently playing sound first.
 * If a play is already in progress, returns immediately so the sound only plays once.
 * On Windows, starts the default app and resolves immediately (no stop support).
 */
export async function playSound(urlOrPath: string): Promise<void> {
  if (playSoundInProgress) {
    return;
  }
  playSoundInProgress = true;
  stopCurrentSound();
  try {
    const filePath = await resolveToFilePath(urlOrPath);
    const quoted = escapePath(filePath);

    if (isWindows) {
      const cmd = `start "" "${quoted}"`;
      exec(cmd, { shell: "cmd.exe" });
      playSoundInProgress = false;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const isTemp = isUrl(urlOrPath);
      const done = () => {
        playSoundInProgress = false;
      };
      currentProcess = exec(`afplay "${quoted}"`, (error) => {
        currentProcess = null;
        if (isTemp) {
          unlink(filePath).catch(() => {});
        }
        done();
        if (error && error.killed) {
          resolve();
        } else if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  } catch (err) {
    playSoundInProgress = false;
    throw err;
  }
}

/**
 * Start playback in the background and return immediately.
 * macOS: nohup afplay so it survives process exit. Windows: start (default app).
 * Debounced: if called again within BACKGROUND_PLAY_DEBOUNCE_MS, does nothing so the sound only plays once.
 */
export async function playSoundInBackground(urlOrPath: string): Promise<void> {
  const now = Date.now();
  if (now - lastBackgroundPlayTime < BACKGROUND_PLAY_DEBOUNCE_MS) {
    return;
  }
  lastBackgroundPlayTime = now;

  const filePath = await resolveToFilePath(urlOrPath);
  const quoted = escapePath(filePath);

  if (isWindows) {
    const cmd = `start "" "${quoted}"`;
    exec(cmd, { shell: "cmd.exe" });
    return;
  }

  const bgCmd = `nohup afplay "${quoted}" </dev/null >/dev/null 2>&1 &`;
  exec(bgCmd, { shell: "/bin/sh" });

  const isTemp = isUrl(urlOrPath);
  if (isTemp) {
    const CLEANUP_DELAY_MS = 120_000;
    setTimeout(() => {
      unlink(filePath).catch(() => {});
    }, CLEANUP_DELAY_MS);
  }
}

export async function cleanupTempFiles(): Promise<void> {
  try {
    if (existsSync(TEMP_DIR)) {
      const files = await readdir(TEMP_DIR);
      for (const file of files) {
        await unlink(path.join(TEMP_DIR, file)).catch(() => {});
      }
    }
  } catch {
    // ignore
  }
}
