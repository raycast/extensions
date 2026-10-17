import { chmodSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { configureOnnxRuntime, InferenceEngine, type InferenceEngineLike } from "./lib/inference";
import type { WorkerRequest, WorkerResponse } from "./types";

const IDLE_TIMEOUT_MS = 10 * 60_000;

function argument(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing --${name}`);
  return process.argv[index + 1];
}

const socketPath = argument("socket");
const authToken = argument("token");
const runtimeDirectory = argument("runtime-dir");
const supportPath = argument("support-path");
const pidPath = path.join(supportPath, "runtime", "worker.pid");
let engine: InferenceEngineLike | undefined;
let engineDirectory: string | undefined;
let queue = Promise.resolve();
let idleTimer: NodeJS.Timeout;

configureOnnxRuntime(runtimeDirectory);

function resetIdleTimer(): void {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => void shutdown(), IDLE_TIMEOUT_MS);
  idleTimer.unref();
}

function isInsideSupportPath(candidate: string, childDirectory: string): boolean {
  const allowed = path.join(supportPath, childDirectory) + path.sep;
  return path.resolve(candidate).startsWith(allowed);
}

async function processRequest(request: WorkerRequest): Promise<WorkerResponse> {
  if (request.protocol !== 3 || request.authToken !== authToken) {
    return {
      protocol: 3,
      requestId: request.requestId,
      ok: false,
      error: "Unauthorized or incompatible worker request.",
    };
  }
  resetIdleTimer();
  if (request.type === "ping") return { protocol: 3, requestId: request.requestId, ok: true, pong: true };
  const modelDirectory = request.type === "recognize" || request.type === "warm" ? request.modelDirectory : undefined;
  const imagePath = request.type === "recognize" ? request.imagePath : undefined;
  if (
    !modelDirectory ||
    !isInsideSupportPath(modelDirectory, "models") ||
    (imagePath !== undefined && !isInsideSupportPath(imagePath, "captures"))
  ) {
    return {
      protocol: 3,
      requestId: request.requestId,
      ok: false,
      error: "Worker paths must stay inside extension support storage.",
    };
  }
  try {
    if (!engine || engineDirectory !== modelDirectory) {
      engine = await InferenceEngine.create(modelDirectory);
      engineDirectory = modelDirectory;
    }
    if (request.type === "warm") return { protocol: 3, requestId: request.requestId, ok: true };
    if (!imagePath) throw new Error("Worker recognize request did not include an image.");
    const result = await engine.recognize(imagePath);
    return { protocol: 3, requestId: request.requestId, ok: true, result };
  } catch (error) {
    return {
      protocol: 3,
      requestId: request.requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk;
    const newline = buffer.indexOf("\n");
    if (newline < 0) return;
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    queue = queue.then(async () => {
      let response: WorkerResponse;
      try {
        response = await processRequest(JSON.parse(line) as WorkerRequest);
      } catch (error) {
        response = {
          protocol: 3,
          requestId: "unknown",
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      socket.end(`${JSON.stringify(response)}\n`);
    });
  });
});

async function shutdown(): Promise<void> {
  server.close();
  await Promise.all([rm(socketPath, { force: true }), rm(pidPath, { force: true })]);
  process.exit(0);
}

server.on("error", (error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());

async function main(): Promise<void> {
  await mkdir(path.dirname(socketPath), { recursive: true, mode: 0o700 });
  await rm(socketPath, { force: true });
  await writeFile(pidPath, String(process.pid), { mode: 0o600 });
  server.listen(socketPath, () => {
    try {
      // Synchronous chmod avoids an async race with stale-worker cleanup.
      chmodSync(socketPath, 0o600);
      resetIdleTimer();
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      server.close();
      process.exitCode = 1;
    }
  });
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
