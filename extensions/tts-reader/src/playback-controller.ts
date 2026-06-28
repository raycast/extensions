import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { spawn } from "child_process";
import { ensureToolingInPath } from "./path-utils";

export type PlaybackState = {
  pid: number;
  filePath: string;
  player: "afplay" | "ffplay";
  status?: "playing" | "stopping";
};

type PlaybackCompletion = "finished" | "stopped";
type PlaybackPump = (stdin: NodeJS.WritableStream, abortSignal: AbortSignal) => Promise<void>;

type PlaybackProcessOptions = {
  player: PlaybackState["player"];
  args: string[];
  filePath: string;
  pump?: PlaybackPump;
  externalAbort?: AbortController;
  missingProcessMessage: string;
};

const audioDir = join(homedir(), ".cache", "raycast-tts");
const playbackStatePath = join(audioDir, "playback-state.json");
const systemPsPath = "/bin/ps";
const spawnEnv = { ...process.env, PATH: ensureToolingInPath() };
let preferredPlayerCache: PlaybackState["player"] | null = null;

const STDIN_PLAYBACK_PATH = "stdin";

export const DEFAULT_STDIN_FFPLAY_ARGS = ["-nodisp", "-autoexit", "-loglevel", "error", "-i", "-"];

export async function isFfplayAvailable(): Promise<boolean> {
  return await isCommandAvailable("ffplay");
}

export async function startStdinPlayback(
  pump: PlaybackPump,
  externalAbort?: AbortController,
  ffplayArgs: string[] = DEFAULT_STDIN_FFPLAY_ARGS,
): Promise<PlaybackCompletion> {
  await stopPlayback().catch(() => false);

  return await runPlaybackProcess({
    player: "ffplay",
    args: ffplayArgs,
    filePath: STDIN_PLAYBACK_PATH,
    pump,
    externalAbort,
    missingProcessMessage: "ffplay did not return a process id or stdin pipe",
  });
}

export async function startPlayback(filePath: string): Promise<PlaybackCompletion> {
  await stopPlayback().catch(() => false);

  const preferredPlayer = await getPreferredPlayer();

  try {
    return await startPlaybackWithPlayer(filePath, preferredPlayer);
  } catch (error) {
    if (preferredPlayer === "ffplay" && shouldFallbackToAfplay(error)) {
      return await startPlaybackWithPlayer(filePath, "afplay");
    }
    throw error;
  }
}

async function startPlaybackWithPlayer(filePath: string, player: PlaybackState["player"]): Promise<PlaybackCompletion> {
  return await runPlaybackProcess({
    player,
    args: getPlaybackArgs(player, filePath),
    filePath,
    missingProcessMessage: `${player} did not return a process id`,
  });
}

async function runPlaybackProcess(options: PlaybackProcessOptions): Promise<PlaybackCompletion> {
  const abortController = options.externalAbort ?? new AbortController();
  const pump = options.pump;

  return await new Promise<PlaybackCompletion>((resolve, reject) => {
    const playbackProcess = spawn(options.player, options.args, {
      env: spawnEnv,
      stdio: [pump ? "pipe" : "ignore", "ignore", "pipe"],
    });
    const pid = playbackProcess.pid;
    const stdin = playbackProcess.stdin;

    if (!pid || (pump && !stdin)) {
      playbackProcess.kill("SIGTERM");
      reject(new Error(options.missingProcessMessage));
      return;
    }

    let errorOutput = "";
    let settled = false;
    let statePersisted = false;

    const stateWrite = writePlaybackState({
      pid,
      filePath: options.filePath,
      player: options.player,
      status: "playing",
    })
      .then(() => {
        statePersisted = true;
      })
      .catch(async (err) => {
        abortController.abort();
        try {
          playbackProcess.kill("SIGTERM");
        } catch {
          // If the player already exited, the close/error handler will resolve the real outcome.
        }
        throw err;
      });

    const settle = (handler: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      abortController.abort();
      void stateWrite
        .catch(() => undefined)
        .then(async () => {
          if (statePersisted) {
            await clearPlaybackState(pid);
          }
        })
        .finally(handler);
    };

    playbackProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    playbackProcess.on("close", (code, signal) => {
      void readPlaybackState()
        .catch(() => null)
        .then((state) => {
          const wasStopped = state?.pid === pid && state.status === "stopping";

          settle(() => {
            if (wasStopped) {
              resolve("stopped");
              return;
            }

            if (code === 0) {
              resolve("finished");
              return;
            }

            if (signal === "SIGTERM" || signal === "SIGKILL") {
              resolve("stopped");
              return;
            }

            const errorMessage = `${options.player} exited with code ${code}`;
            const detailedError = errorOutput ? `${errorMessage}: ${errorOutput}` : errorMessage;
            reject(new Error(detailedError));
          });
        });
    });

    playbackProcess.on("error", (err) => {
      settle(() => {
        reject(new Error(`${options.player} process error: ${err.message}`));
      });
    });

    if (!pump || !stdin) {
      void stateWrite.catch((err) => {
        settle(() => {
          reject(new Error(`Failed to persist playback state: ${err.message}`));
        });
      });
      return;
    }

    void stateWrite
      .then(() =>
        pump(stdin, abortController.signal).catch((err) => {
          if (abortController.signal.aborted) {
            return;
          }
          try {
            playbackProcess.kill("SIGTERM");
          } catch {
            // The close/error handler will settle if the player already exited.
          }
          settle(() => {
            reject(err instanceof Error ? err : new Error(String(err)));
          });
        }),
      )
      .catch((err) => {
        settle(() => {
          reject(new Error(`Failed to persist playback state: ${err.message}`));
        });
      });
  });
}

export async function stopPlayback(): Promise<boolean> {
  const state = await readPlaybackState();
  if (!state) {
    return false;
  }

  if (!(await isTrackedPlaybackProcess(state))) {
    await clearPlaybackState(state.pid);
    return false;
  }

  await writePlaybackState({ ...state, status: "stopping" });
  await stopProcess(state.pid);
  return true;
}

async function stopProcess(pid: number): Promise<void> {
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (!isUnavailableProcessError(error)) {
      throw error;
    }
    return;
  }

  if (await waitForExit(pid, 2000)) {
    return;
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (!isUnavailableProcessError(error)) {
      throw error;
    }
    return;
  }

  await waitForExit(pid, 1000);
}

async function waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!(await isProcessAlive(pid))) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return !(await isProcessAlive(pid));
}

async function readPlaybackState(): Promise<PlaybackState | null> {
  try {
    const raw = await readFile(playbackStatePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PlaybackState>;

    if (
      typeof parsed.pid !== "number" ||
      typeof parsed.filePath !== "string" ||
      (parsed.player !== "afplay" && parsed.player !== "ffplay") ||
      (parsed.status !== undefined && parsed.status !== "playing" && parsed.status !== "stopping")
    ) {
      await rm(playbackStatePath, { force: true });
      return null;
    }

    return parsed as PlaybackState;
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

async function writePlaybackState(state: PlaybackState): Promise<void> {
  await mkdir(audioDir, { recursive: true });
  const tempPath = `${playbackStatePath}.${process.pid}.tmp`;
  await writeFile(tempPath, JSON.stringify(state), "utf8");
  await rename(tempPath, playbackStatePath);
}

async function clearPlaybackState(expectedPid: number): Promise<void> {
  const state = await readPlaybackState();
  if (!state || state.pid !== expectedPid) {
    return;
  }
  await rm(playbackStatePath, { force: true });
}

async function isProcessAlive(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (isUnavailableProcessError(error)) {
      return false;
    }
    throw error;
  }
}

async function isTrackedPlaybackProcess(state: PlaybackState): Promise<boolean> {
  if (!(await isProcessAlive(state.pid))) {
    return false;
  }

  const command = await readProcessCommand(state.pid);
  return command === state.player;
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

async function readProcessCommand(pid: number): Promise<string | null> {
  const result = await new Promise<string | null>((resolve, reject) => {
    const child = spawn(systemPsPath, ["-p", String(pid), "-o", "comm="], {
      env: spawnEnv,
      stdio: ["ignore", "pipe", "ignore"],
    });

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }

      const command = output.trim().split("/").pop() || null;
      resolve(command);
    });
  });

  return result;
}

function isUnavailableProcessError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error.code === "ESRCH" || error.code === "EPERM"),
  );
}

async function getPreferredPlayer(): Promise<PlaybackState["player"]> {
  if (preferredPlayerCache) {
    return preferredPlayerCache;
  }

  preferredPlayerCache = (await isCommandAvailable("ffplay")) ? "ffplay" : "afplay";
  return preferredPlayerCache;
}

async function isCommandAvailable(command: string): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const child = spawn(command, ["-version"], {
      env: spawnEnv,
      stdio: "ignore",
    });

    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

function getPlaybackArgs(player: PlaybackState["player"], filePath: string): string[] {
  if (player === "ffplay") {
    return ["-nodisp", "-autoexit", "-loglevel", "error", filePath];
  }

  return ["-v", "1.0", filePath];
}

function shouldFallbackToAfplay(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("ffplay");
}
