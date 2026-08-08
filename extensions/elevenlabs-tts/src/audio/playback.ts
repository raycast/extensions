import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "os";
import { basename, join } from "path";
import { lock, LockOptions } from "proper-lockfile";
import { promisify } from "util";

interface HeldSession {
  release: () => Promise<void>;
  isCompromised: () => boolean;
}

interface PlaybackRecord {
  sessionId: string;
  pid: number;
  audioFile: string;
}

const SESSION_LOCK_PATH = join(tmpdir(), "elevenlabs-tts-session-v2");
const SESSION_LOCK_OPTIONS: LockOptions = { stale: 10_000, update: 2_000 };
const PLAYBACK_FILE = join(tmpdir(), "elevenlabs-tts-playback.json");
const execFileAsync = promisify(execFile);

export class SpeechSessionLock {
  private readonly sessions = new Map<string, HeldSession>();

  constructor(
    private readonly lockPath: string,
    private readonly options: LockOptions = SESSION_LOCK_OPTIONS,
    private readonly cleanupPreviousSession: () => Promise<unknown> = async () => undefined,
  ) {}

  async begin(): Promise<string | undefined> {
    const sessionId = randomUUID();
    let compromised = false;
    let release: () => Promise<void>;

    try {
      release = await lock(this.lockPath, {
        ...this.options,
        realpath: false,
        retries: 0,
        onCompromised: () => {
          compromised = true;
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ELOCKED") return undefined;
      throw error;
    }

    this.sessions.set(sessionId, { release, isCompromised: () => compromised });
    try {
      await this.cleanupPreviousSession();
      if (await readPlayback()) {
        await this.end(sessionId);
        return undefined;
      }
    } catch (error) {
      await this.end(sessionId);
      throw error;
    }
    return sessionId;
  }

  async end(sessionId: string): Promise<void> {
    const heldSession = this.sessions.get(sessionId);
    if (!heldSession) return;

    this.sessions.delete(sessionId);
    try {
      await heldSession.release();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ERELEASED" && code !== "ENOTACQUIRED") throw error;
    }
  }

  owns(sessionId: string): boolean {
    const heldSession = this.sessions.get(sessionId);
    return Boolean(heldSession && !heldSession.isCompromised());
  }
}

const speechSessionLock = new SpeechSessionLock(SESSION_LOCK_PATH, SESSION_LOCK_OPTIONS, stopActivePlayback);

export function isOwnedPlaybackCommand(command: string, audioFile: string): boolean {
  const normalizedCommand = command.trim();
  const executable = normalizedCommand.split(/\s+/, 1)[0];
  return basename(executable) === "afplay" && normalizedCommand.endsWith(` ${audioFile}`);
}

export async function beginSpeechSession(): Promise<string | undefined> {
  return speechSessionLock.begin();
}

export async function endSpeechSession(sessionId: string): Promise<void> {
  const playback = await readPlayback();
  if (playback?.sessionId === sessionId) await removePlaybackFile();
  await speechSessionLock.end(sessionId);
}

export async function registerPlayback(sessionId: string, pid: number, audioFile: string): Promise<void> {
  if (!speechSessionLock.owns(sessionId)) throw new Error("Speech session expired");

  await fs.writeFile(PLAYBACK_FILE, JSON.stringify({ sessionId, pid, audioFile }), "utf8");
}

export async function clearPlayback(sessionId: string, expectedPid: number): Promise<void> {
  const record = await readPlayback();
  if (record?.sessionId !== sessionId || record.pid !== expectedPid) return;

  await removePlaybackFile();
}

export async function stopActivePlayback(): Promise<boolean> {
  const playback = await readPlayback();
  if (!playback) return false;

  return stopPlaybackForSession(playback.sessionId);
}

async function stopPlaybackForSession(sessionId: string): Promise<boolean> {
  const record = await readPlayback();
  if (record?.sessionId !== sessionId) return false;

  try {
    const { stdout } = await execFileAsync("ps", ["-p", String(record.pid), "-o", "command="], {
      timeout: 1000,
    });
    if (!isOwnedPlaybackCommand(stdout, record.audioFile)) {
      await removePlaybackFile();
      return false;
    }

    process.kill(record.pid, "SIGTERM");
    await clearPlayback(sessionId, record.pid);
    return true;
  } catch {
    try {
      process.kill(record.pid, "SIGTERM");
      await clearPlayback(sessionId, record.pid);
      return true;
    } catch (killError) {
      if ((killError as NodeJS.ErrnoException).code === "ESRCH") {
        await clearPlayback(sessionId, record.pid);
      }
      return false;
    }
  }
}

async function readPlayback(): Promise<PlaybackRecord | undefined> {
  try {
    const value = JSON.parse(await fs.readFile(PLAYBACK_FILE, "utf8")) as Partial<PlaybackRecord>;
    if (
      typeof value.sessionId !== "string" ||
      !Number.isInteger(value.pid) ||
      (value.pid as number) <= 0 ||
      typeof value.audioFile !== "string"
    ) {
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
