import { execFile } from "child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "os";
import { basename, join } from "path";
import { promisify } from "util";

interface PlaybackRecord {
  pid: number;
  audioFile: string;
}

const PLAYBACK_FILE = join(tmpdir(), "elevenlabs-tts-playback.json");
const execFileAsync = promisify(execFile);

export function isOwnedPlaybackCommand(command: string, audioFile: string): boolean {
  const normalizedCommand = command.trim();
  const executable = normalizedCommand.split(/\s+/, 1)[0];
  return basename(executable) === "afplay" && normalizedCommand.endsWith(` ${audioFile}`);
}

export async function registerPlayback(pid: number, audioFile: string): Promise<void> {
  await fs.writeFile(PLAYBACK_FILE, JSON.stringify({ pid, audioFile }), "utf8");
}

export async function clearPlayback(expectedPid: number): Promise<void> {
  const record = await readPlayback();
  if (record?.pid !== expectedPid) return;

  await removePlaybackFile();
}

export async function stopActivePlayback(): Promise<boolean> {
  const record = await readPlayback();
  if (!record) return false;

  try {
    const { stdout } = await execFileAsync("ps", ["-p", String(record.pid), "-o", "command="], {
      timeout: 1000,
    });
    if (!isOwnedPlaybackCommand(stdout, record.audioFile)) {
      await removePlaybackFile();
      return false;
    }

    process.kill(record.pid, "SIGTERM");
    await clearPlayback(record.pid);
    return true;
  } catch {
    await clearPlayback(record.pid);
    return false;
  }
}

async function readPlayback(): Promise<PlaybackRecord | undefined> {
  try {
    const value = JSON.parse(await fs.readFile(PLAYBACK_FILE, "utf8")) as Partial<PlaybackRecord>;
    if (!Number.isInteger(value.pid) || (value.pid as number) <= 0 || typeof value.audioFile !== "string") {
      await removePlaybackFile();
      return undefined;
    }
    return value as PlaybackRecord;
  } catch {
    await removePlaybackFile();
    return undefined;
  }
}

async function removePlaybackFile(): Promise<void> {
  try {
    await fs.unlink(PLAYBACK_FILE);
  } catch {
    // Playback state cleanup is best-effort.
  }
}
