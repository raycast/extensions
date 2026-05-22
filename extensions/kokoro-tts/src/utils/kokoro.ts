import { environment } from "@raycast/api";
import { spawn } from "child_process";
import { readdir, readFile, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { checkDependencies, DependencySetupError } from "./check-dependencies";

const SERVER_PORT = 7680;
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;
const TMP_DIR = "/tmp";
const TMP_PREFIX = "raycast-kokoro";
const PLAYER_PID_PATH = `${TMP_DIR}/${TMP_PREFIX}.pid`;
const SERVER_PID_PATH = `${TMP_DIR}/${TMP_PREFIX}-server.pid`;
const SERVER_SCRIPT = join(environment.assetsPath, "kokoro_server.py");
const PLAYER_SCRIPT = join(environment.assetsPath, "play_queue.sh");

/** Thrown when playback was cancelled (Stop command) while still streaming. */
class PlaybackStoppedError extends Error {}

async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function killExistingServer(): Promise<void> {
  try {
    const pidStr = await readFile(SERVER_PID_PATH, "utf-8");
    const pid = parseInt(pidStr.trim(), 10);
    if (!isNaN(pid)) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // already dead
      }
    }
  } catch {
    // no pid file
  }
}

function startServerProcess(pythonPath: string): void {
  const child = spawn(
    pythonPath,
    [SERVER_SCRIPT, "--port", String(SERVER_PORT), "--idle-timeout", "900"],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
}

async function waitForServer(maxWaitMs: number = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isServerRunning()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    `Kokoro server failed to start within ${maxWaitMs / 1000}s. Check the Raycast extension log for details (⌘⇧, → Extensions → Kokoro TTS → Script Command Log).`,
  );
}

async function ensureServer(pythonPath: string): Promise<void> {
  if (await isServerRunning()) return;

  const depError = checkDependencies(pythonPath);
  if (depError) {
    throw new DependencySetupError(
      depError.title,
      depError.message,
      depError.fixCommand,
    );
  }

  await killExistingServer();
  startServerProcess(pythonPath);
  await waitForServer();
}

/**
 * Read a length-prefixed binary stream, invoking `onFrame` for each complete
 * frame (4-byte big-endian length, then that many bytes). Returns the frame count.
 */
async function readFrames(
  body: ReadableStream<Uint8Array>,
  onFrame: (data: Buffer, index: number) => Promise<void>,
): Promise<number> {
  const reader = body.getReader();
  let buffer = Buffer.alloc(0);
  let index = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) buffer = Buffer.concat([buffer, Buffer.from(value)]);

      while (buffer.length >= 4) {
        const len = buffer.readUInt32BE(0);
        if (buffer.length < 4 + len) break;
        await onFrame(buffer.subarray(4, 4 + len), index);
        buffer = buffer.subarray(4 + len);
        index += 1;
      }

      if (done) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  return index;
}

/** True if the given pid is still a live process. */
function isAlive(pid: number | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Synthesise `text` and play it back, streaming sentence-by-sentence so audio
 * starts almost immediately. `onPlaybackStart` fires when the first segment is
 * handed to the player.
 */
export async function speak(
  text: string,
  voice: string,
  speed: number,
  pythonPath: string,
  onPlaybackStart?: () => void,
): Promise<void> {
  await stopSpeaking();
  await ensureServer(pythonPath);

  const sessionPrefix = `${TMP_DIR}/${TMP_PREFIX}-${Date.now()}`;

  // Detached player: keeps playing queued segments after this command exits.
  const player = spawn("/bin/sh", [PLAYER_SCRIPT, sessionPrefix], {
    detached: true,
    stdio: "ignore",
  });
  player.unref();
  if (player.pid) {
    await writeFile(PLAYER_PID_PATH, String(player.pid));
  }

  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/speak/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, speed }),
      signal: AbortSignal.timeout(600_000),
    });
  } catch (error) {
    await stopSpeaking();
    throw error;
  }

  if (!res.ok || !res.body) {
    const detail = res.body ? await res.text() : "no response body";
    await stopSpeaking();
    throw new Error(`TTS failed: ${detail}`);
  }

  let started = false;
  let count = 0;
  try {
    count = await readFrames(res.body, async (data, index) => {
      // If the user pressed Stop, the player is gone — abort the stream.
      if (!isAlive(player.pid)) throw new PlaybackStoppedError();

      const segment = `${sessionPrefix}-${index}.wav`;
      await writeFile(segment, data);
      // The ".ready" marker is written last so a half-written file never plays.
      await writeFile(`${segment}.ready`, "");

      if (!started) {
        started = true;
        onPlaybackStart?.();
      }
    });
  } catch (error) {
    if (error instanceof PlaybackStoppedError) return;
    await writeFile(`${sessionPrefix}.done`, "").catch(() => {});
    throw error;
  }

  // Signal the player that no more segments are coming.
  await writeFile(`${sessionPrefix}.done`, "");

  if (count === 0) {
    await stopSpeaking();
    throw new Error("No audio was generated");
  }
}

/** Stop any playback in progress and clean up its temporary files. */
export async function stopSpeaking(): Promise<void> {
  try {
    const pidStr = await readFile(PLAYER_PID_PATH, "utf-8");
    const pid = parseInt(pidStr.trim(), 10);
    if (!isNaN(pid)) {
      try {
        // Kill the whole process group: the player script and its afplay child.
        process.kill(-pid, "SIGTERM");
      } catch {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          // already exited
        }
      }
    }
  } catch {
    // no pid file
  }

  await unlink(PLAYER_PID_PATH).catch(() => {});

  // Remove leftover session files (segments and markers), keep the server pid.
  try {
    const entries = await readdir(TMP_DIR);
    await Promise.all(
      entries
        .filter(
          (name) =>
            name.startsWith(`${TMP_PREFIX}-`) &&
            name !== `${TMP_PREFIX}-server.pid`,
        )
        .map((name) => unlink(join(TMP_DIR, name)).catch(() => {})),
    );
  } catch {
    // /tmp not readable; nothing to clean
  }
}
