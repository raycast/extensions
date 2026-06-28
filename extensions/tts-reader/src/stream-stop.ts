import { randomUUID } from "crypto";
import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const audioDir = join(homedir(), ".cache", "raycast-tts");
const streamSessionPath = join(audioDir, "stream-session.json");
const streamStopPath = join(audioDir, "stream-stop.json");

export type StreamSession = {
  sessionId: string;
};

export type StreamStopMarker = {
  target: "all" | string;
  requestedAt: number;
};

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  await mkdir(audioDir, { recursive: true });
  const tempPath = `${path}.${process.pid}.tmp`;
  await writeFile(tempPath, JSON.stringify(value), "utf8");
  await rename(tempPath, path);
}

export async function registerStreamSession(): Promise<string> {
  const sessionId = randomUUID();
  await writeJsonAtomically(streamSessionPath, { sessionId } satisfies StreamSession);
  await clearStreamStopMarker();
  return sessionId;
}

export async function clearStreamSession(sessionId: string): Promise<void> {
  try {
    const session = await readStreamSession();
    if (session?.sessionId !== sessionId) {
      return;
    }
    await rm(streamSessionPath, { force: true });
  } catch (error) {
    if (isMissingFileError(error)) {
      return;
    }
    throw error;
  }
}

export async function readStreamSession(): Promise<StreamSession | null> {
  try {
    const raw = await readFile(streamSessionPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StreamSession>;
    if (typeof parsed.sessionId !== "string" || parsed.sessionId.length === 0) {
      await rm(streamSessionPath, { force: true });
      return null;
    }
    return { sessionId: parsed.sessionId };
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

export async function requestStreamStop(target: "all" | string): Promise<void> {
  await writeJsonAtomically(streamStopPath, {
    target,
    requestedAt: Date.now(),
  } satisfies StreamStopMarker);
}

export async function clearStreamStopMarker(): Promise<void> {
  try {
    await rm(streamStopPath, { force: true });
  } catch (error) {
    if (isMissingFileError(error)) {
      return;
    }
    throw error;
  }
}

export async function shouldStopStream(sessionId: string): Promise<boolean> {
  try {
    const raw = await readFile(streamStopPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StreamStopMarker>;
    if (typeof parsed.target !== "string") {
      await rm(streamStopPath, { force: true });
      return false;
    }
    return parsed.target === "all" || parsed.target === sessionId;
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }
    throw error;
  }
}

export function startStreamStopPolling(
  sessionId: string,
  abortController: AbortController,
  intervalMs = 100,
): () => void {
  let active = true;
  const timer = setInterval(() => {
    void (async () => {
      if (!active || abortController.signal.aborted) {
        return;
      }
      try {
        if (await shouldStopStream(sessionId)) {
          abortController.abort();
        }
      } catch {
        // Missing or stale marker should be harmless.
      }
    })();
  }, intervalMs);

  return () => {
    active = false;
    clearInterval(timer);
  };
}
