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

  let command: string;
  try {
    ({ stdout: command } = await execFileAsync("ps", ["-p", String(record.pid), "-o", "command="], {
      timeout: 1000,
    }));
  } catch {
    // ps exits non-zero when the PID is gone; on any other failure the owner is unverified,
    // so keep the record and let begin() deny takeover rather than signal a possibly reused PID.
    if (isProcessGone(record.pid)) await clearPlayback(sessionId, record.pid);
    return false;
  }

  if (!isOwnedPlaybackCommand(command, record.audioFile)) {
    await removePlaybackFile();
    return false;
  }

  try {
    process.kill(record.pid, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") return false;
  }
  if (!(await waitForPlaybackExit(record, 1_000))) return false;

  await clearPlayback(sessionId, record.pid);
  return true;
}

function isProcessGone(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

// kill(pid, 0) also succeeds for a zombie (Raycast's host process never reaps players
// spawned by an interrupted command), so exit is detected by ps no longer reporting
// the owned afplay command: a reaped pid fails ps and a zombie shows <defunct>.
async function waitForPlaybackExit(record: PlaybackRecord, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  do {
    if (!(await isPlaybackProcessRunning(record))) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  } while (Date.now() < deadline);
  return !(await isPlaybackProcessRunning(record));
}

async function isPlaybackProcessRunning(record: PlaybackRecord): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("ps", ["-p", String(record.pid), "-o", "command="], {
      timeout: 1000,
    });
    return isOwnedPlaybackCommand(stdout, record.audioFile);
  } catch (error) {
    // ps exits 1 when the pid is gone; on any other failure (timeout, spawn error)
    // fall back to a liveness probe instead of assuming the player exited
    if ((error as { code?: number | string }).code === 1) return false;
    return !isProcessGone(record.pid);
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
