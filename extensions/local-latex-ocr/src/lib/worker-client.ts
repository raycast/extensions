import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import type { OcrResult, WorkerRequest, WorkerResponse } from "../types";

// The worker answers ping before loading model sessions, so a healthy start is
// normally sub-second. Keep failures from turning into an 8-second cold-start
// penalty before direct inference takes over.
const START_TIMEOUT_MS = 2_500;
const REQUEST_TIMEOUT_MS = 2 * 60_000;

type WorkerPaths = {
  supportPath: string;
  socketPath: string;
  legacySocketPath: string;
  tokenPath: string;
  logPath: string;
  pidPath: string;
  startLockPath: string;
  workerPath: string;
  runtimeDirectory: string;
};

export async function recognizeWithWorker(input: {
  supportPath: string;
  assetsPath: string;
  imagePath: string;
  modelDirectory: string;
}): Promise<OcrResult> {
  const paths = getWorkerPaths(input.supportPath, input.assetsPath);
  const token = ensureAuthToken(paths.tokenPath);
  try {
    await ensureWorker(paths, token);
    const response = await sendRequest(paths.socketPath, {
      protocol: 3,
      type: "recognize",
      requestId: randomUUID(),
      authToken: token,
      imagePath: input.imagePath,
      modelDirectory: input.modelDirectory,
    });
    if (!response.ok || !response.result)
      throw new Error(response.ok ? "Worker returned no OCR result." : response.error);
    return response.result;
  } catch (workerError) {
    // Store-safe fallback: run the same local runtime directly in the command and accept a cold start.
    const { configureOnnxRuntime, InferenceEngine } = await import("./inference");
    configureOnnxRuntime(paths.runtimeDirectory);
    try {
      return await (await InferenceEngine.create(input.modelDirectory)).recognize(input.imagePath);
    } catch (directError) {
      const workerMessage =
        workerError instanceof Error ? workerError.message : String(workerError);
      const directMessage =
        directError instanceof Error ? directError.message : String(directError);
      throw new Error(
        `OCR worker failed (${workerMessage}); direct inference also failed (${directMessage}).`,
      );
    }
  }
}

/** Start the worker and load model sessions while the user is selecting a region. */
export async function warmWorker(input: {
  supportPath: string;
  assetsPath: string;
  modelDirectory: string;
}): Promise<void> {
  const paths = getWorkerPaths(input.supportPath, input.assetsPath);
  const token = ensureAuthToken(paths.tokenPath);
  await ensureWorker(paths, token);
  const response = await sendRequest(paths.socketPath, {
    protocol: 3,
    type: "warm",
    requestId: randomUUID(),
    authToken: token,
    modelDirectory: input.modelDirectory,
  });
  if (!response.ok) throw new Error(response.error);
}

function getWorkerPaths(supportPath: string, assetsPath: string): WorkerPaths {
  const runtimeState = path.join(supportPath, "runtime");
  mkdirSync(runtimeState, { recursive: true, mode: 0o700 });
  // macOS limits AF_UNIX pathnames to roughly 104 bytes. Raycast's support
  // path is long enough to be silently truncated by the kernel, producing a
  // socket named "worke" and forcing every command into a retry/cold-start.
  const uid = process.getuid?.() ?? "user";
  const identity = createHash("sha256").update(supportPath).digest("hex").slice(0, 16);
  const socketDirectory = path.join("/tmp", `local-latex-ocr-${uid}`, identity);
  mkdirSync(socketDirectory, { recursive: true, mode: 0o700 });
  return {
    supportPath,
    socketPath: path.join(socketDirectory, "worker.sock"),
    legacySocketPath: path.join(runtimeState, "worker.sock"),
    tokenPath: path.join(runtimeState, "auth-token"),
    logPath: path.join(runtimeState, "worker.log"),
    pidPath: path.join(runtimeState, "worker.pid"),
    startLockPath: path.join(runtimeState, "worker.start.lock"),
    workerPath: path.join(assetsPath, "runtime", "worker.cjs"),
    runtimeDirectory: path.join(assetsPath, "runtime"),
  };
}

function ensureAuthToken(tokenPath: string): string {
  try {
    const token = readFileSync(tokenPath, "utf8").trim();
    if (token.length === 64) return token;
  } catch {
    // Generate a token below.
  }
  const token = randomBytes(32).toString("hex");
  writeFileSync(tokenPath, token, { mode: 0o600 });
  return token;
}

async function ensureWorker(paths: WorkerPaths, token: string): Promise<void> {
  const ping = (): Promise<WorkerResponse> =>
    sendRequest(paths.socketPath, {
      protocol: 3,
      type: "ping",
      requestId: randomUUID(),
      authToken: token,
    });
  try {
    const response = await ping();
    if (response.ok && response.pong) return;
  } catch {
    // A dead socket is cleaned up only after acquiring the start lock. Removing
    // it here can orphan a live worker and make concurrent commands race.
  }

  const lockFd = acquireStartLock(paths.startLockPath);
  if (lockFd < 0) {
    await waitForWorker(ping);
    return;
  }

  const logFd = openSync(
    paths.logPath,
    constants.O_CREAT | constants.O_WRONLY | constants.O_APPEND,
    0o600,
  );
  try {
    try {
      const response = await ping();
      if (response.ok && response.pong) return;
    } catch {
      await stopStaleWorker(paths);
    }
    const child = spawn(
      process.execPath,
      [
        paths.workerPath,
        "--socket",
        paths.socketPath,
        "--support-path",
        paths.supportPath,
        "--token",
        token,
        "--runtime-dir",
        paths.runtimeDirectory,
      ],
      { detached: true, stdio: ["ignore", logFd, logFd] },
    );
    child.unref();
  } finally {
    closeSync(logFd);
    closeSync(lockFd);
    rmSync(paths.startLockPath, { force: true });
  }

  await waitForWorker(ping);
}

function acquireStartLock(lockPath: string): number {
  try {
    return openSync(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    try {
      if (Date.now() - statSync(lockPath).mtimeMs > 30_000) {
        rmSync(lockPath, { force: true });
        return acquireStartLock(lockPath);
      }
    } catch {
      rmSync(lockPath, { force: true });
      return acquireStartLock(lockPath);
    }
    return -1;
  }
}

async function stopStaleWorker(paths: WorkerPaths): Promise<void> {
  try {
    const pid = Number.parseInt(readFileSync(paths.pidPath, "utf8").trim(), 10);
    if (Number.isInteger(pid) && pid > 1 && pid !== process.pid) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // The PID has already exited or belongs to a process we cannot signal.
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } catch {
    // No PID file means the socket itself is the only stale state to remove.
  }
  rmSync(paths.socketPath, { force: true });
  rmSync(paths.legacySocketPath, { force: true });
  // Clean the truncated name left by older builds on long Raycast paths.
  rmSync(path.join(path.dirname(paths.legacySocketPath), "worke"), { force: true });
  rmSync(paths.pidPath, { force: true });
}

async function waitForWorker(ping: () => Promise<WorkerResponse>): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      const response = await ping();
      if (response.ok && response.pong) return;
    } catch {
      // Worker is still initializing.
    }
  }
  throw new Error("Timed out while starting the local OCR worker.");
}

function sendRequest(socketPath: string, request: WorkerRequest): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let buffer = "";
    const timeout = setTimeout(
      () => socket.destroy(new Error("OCR worker request timed out.")),
      REQUEST_TIMEOUT_MS,
    );
    socket.setEncoding("utf8");
    socket.once("connect", () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      socket.end();
      try {
        resolve(JSON.parse(buffer.slice(0, newline)) as WorkerResponse);
      } catch (error) {
        reject(error);
      }
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.once("end", () => {
      if (!buffer.includes("\n")) {
        clearTimeout(timeout);
        reject(new Error("OCR worker closed the connection without a response."));
      }
    });
  });
}
