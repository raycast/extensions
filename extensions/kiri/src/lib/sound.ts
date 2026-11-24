import { environment } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { KiriApi } from "./api";
import { getConnection, getPlayer, setPlayer } from "./storage";

/**
 * Kiri sounds are downloaded once into the extension's support folder and played with macOS's
 * own afplay, in a small shell loop that stops by itself when the block ends. No binaries are
 * bundled.
 */

const run = promisify(execFile);
/** A cached sound is fetched again after this long, so updated recordings reach Raycast too. */
const CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
/** Marks our player in the process list, so we never stop a process that is not ours. */
const PLAYER_TAG = "kiri-raycast-sound";

const LOOP_SCRIPT = [
  "end=$(( $(date +%s) + $2 ))",
  'while [ "$(date +%s)" -lt "$end" ]; do',
  "  left=$(( end - $(date +%s) ))",
  '  /usr/bin/afplay -t "$left" "$1" || exit 0',
  "done",
].join("\n");

function soundDir(): string {
  const dir = join(environment.supportPath, "sounds");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function soundFile(key: string): string {
  if (!/^[a-z0-9_-]{1,40}$/.test(key)) throw new Error("Unknown sound.");
  return join(soundDir(), `${key}.mp3`);
}

export function isCached(key: string): boolean {
  try {
    const file = soundFile(key);
    if (!existsSync(file)) return false;
    const st = statSync(file);
    return st.size > 0 && Date.now() - st.mtimeMs < CACHE_MAX_AGE;
  } catch {
    return false;
  }
}

/** Download a sound unless it is cached. Brown noise works without an account. */
export async function ensureSound(key: string): Promise<string> {
  const file = soundFile(key);
  if (isCached(key)) return file;
  const c = await getConnection();
  const api = new KiriApi(c?.token ?? null);
  const data = c ? await api.sound(key) : key === "brownnoise" ? await api.publicBrownNoise() : null;
  if (!data) throw new Error("Connect your Kiri account to play this sound.");
  if (data.byteLength < 1024) throw new Error("The sound could not be downloaded. Try again.");
  const tmp = `${file}.part`;
  writeFileSync(tmp, Buffer.from(data));
  renameSync(tmp, file);
  return file;
}

/** Play a cached sound on a loop for `seconds`, replacing any sound that is playing. */
export async function playSound(key: string, seconds: number): Promise<void> {
  await stopSound();
  if (!key || seconds < 1) return;
  const file = await ensureSound(key);
  const child = spawn("/bin/sh", ["-c", LOOP_SCRIPT, PLAYER_TAG, file, String(Math.ceil(seconds))], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  if (child.pid) await setPlayer({ pid: child.pid, key });
}

/** Stop the sound this extension started, if it is still playing. */
export async function stopSound(): Promise<void> {
  const player = await getPlayer();
  if (!player) return;
  await setPlayer(null);
  try {
    // Only stop it when the process is still our player (process ids are reused).
    const { stdout } = await run("/bin/ps", ["-o", "command=", "-p", String(player.pid)]);
    if (!stdout.includes(PLAYER_TAG)) return;
    // The loop runs in its own process group: stop the shell and afplay together.
    process.kill(-player.pid, "SIGTERM");
  } catch {
    // Already finished.
  }
}

/** A short system sound for the end of a block (macOS's own sounds). */
export function playEndSound(): void {
  const child = spawn("/usr/bin/afplay", ["/System/Library/Sounds/Glass.aiff"], { detached: true, stdio: "ignore" });
  child.on("error", () => undefined);
  child.unref();
}
