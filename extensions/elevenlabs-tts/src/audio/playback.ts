import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "os";
import { basename, join } from "path";
import { promisify } from "util";

interface SpeechSession {
  id: string;
  ownerPid: number;
}

interface PlaybackRecord {
  sessionId: string;
  pid: number;
  audioFile: string;
}

const SESSION_FILE = join(tmpdir(), "elevenlabs-tts-session.json");
const PLAYBACK_FILE = join(tmpdir(), "elevenlabs-tts-playback.json");
const execFileAsync = promisify(execFile);

export function isOwnedPlaybackCommand(command: string, audioFile: string): boolean {
  const normalizedCommand = command.trim();
  const executable = normalizedCommand.split(/\s+/, 1)[0];
  return basename(executable) === "afplay" && normalizedCommand.endsWith(` ${audioFile}`);
}

export async function beginSpeechSession(): Promise<string | undefined> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const session: SpeechSession = { id: randomUUID(), ownerPid: process.pid };
    try {
      await fs.writeFile(SESSION_FILE, JSON.stringify(session), { encoding: "utf8", flag: "wx" });
      return session.id;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }

    const activeSession = await readSession();
    if (!activeSession || isProcessRunning(activeSession.ownerPid)) return undefined;

    await stopPlaybackForSession(activeSession.id);
    await removeSessionFile(activeSession.id);
  }

  return undefined;
}

export async function endSpeechSession(sessionId: string): Promise<void> {
  const playback = await readPlayback();
  if (playback?.sessionId === sessionId) await removePlaybackFile();
  await removeSessionFile(sessionId);
}

export async function registerPlayback(sessionId: string, pid: number, audioFile: string): Promise<void> {
  const session = await readSession();
  if (session?.id !== sessionId) throw new Error("Speech session expired");

  await fs.writeFile(PLAYBACK_FILE, JSON.stringify({ sessionId, pid, audioFile }), "utf8");
}

export async function clearPlayback(sessionId: string, expectedPid: number): Promise<void> {
  const record = await readPlayback();
  if (record?.sessionId !== sessionId || record.pid !== expectedPid) return;

  await removePlaybackFile();
}

export async function stopActivePlayback(): Promise<boolean> {
  const session = await readSession();
  if (!session) return false;

  return stopPlaybackForSession(session.id);
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
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
    await clearPlayback(sessionId, record.pid);
    return false;
  }
}

async function readSession(): Promise<SpeechSession | undefined> {
  try {
    const value = JSON.parse(await fs.readFile(SESSION_FILE, "utf8")) as Partial<SpeechSession>;
    if (typeof value.id !== "string" || !Number.isInteger(value.ownerPid) || (value.ownerPid as number) <= 0) {
      return undefined;
    }
    return value as SpeechSession;
  } catch {
    return undefined;
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

async function removeSessionFile(expectedId: string): Promise<void> {
  const session = await readSession();
  if (session?.id !== expectedId) return;

  try {
    await fs.unlink(SESSION_FILE);
  } catch {
    // Speech session cleanup is best-effort.
  }
}

async function removePlaybackFile(): Promise<void> {
  try {
    await fs.unlink(PLAYBACK_FILE);
  } catch {
    // Playback state cleanup is best-effort.
  }
}
