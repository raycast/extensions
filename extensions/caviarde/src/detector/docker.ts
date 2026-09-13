import { execFile, spawn } from "node:child_process";
import {
  accessSync,
  constants,
  mkdirSync,
  openSync,
  readFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  CONTAINER_NAME,
  CONTAINER_PORT,
  DETECTOR_IMAGE,
  DOCKER_CANDIDATES,
  DOCKER_HOME_CANDIDATES,
  FLOORS,
  PATCH_TARGET,
} from "./image";

const run = promisify(execFile);

export function findDocker(): string | null {
  const candidates = [
    ...DOCKER_CANDIDATES,
    ...DOCKER_HOME_CANDIDATES.map((p) => join(homedir(), p)),
  ];
  for (const path of candidates) {
    try {
      accessSync(path, constants.X_OK);
      return path;
    } catch {
      continue;
    }
  }
  return null;
}

/** Docker shells out to credential helpers sitting beside its own binary, and
 * Raycast's Node process has almost nothing on PATH. */
function dockerEnv(docker: string): NodeJS.ProcessEnv {
  const dirs = [
    dirname(docker),
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
  ];
  const existing = process.env.PATH;
  return {
    ...process.env,
    PATH:
      [...new Set(dirs)].join(":") +
      (existing === undefined ? "" : `:${existing}`),
  };
}

export async function daemonIsUp(docker: string): Promise<boolean> {
  try {
    await run(docker, ["info", "--format", "{{.ServerVersion}}"], {
      timeout: 15_000,
      env: dockerEnv(docker),
    });
    return true;
  } catch {
    return false;
  }
}

export async function imageIsPresent(docker: string): Promise<boolean> {
  try {
    await run(docker, ["image", "inspect", DETECTOR_IMAGE], {
      timeout: 15_000,
      env: dockerEnv(docker),
    });
    return true;
  } catch {
    return false;
  }
}

/** Detached, with its output journalled: the pull survives the window closing,
 * and the log is what lets the view show progress when it reopens. */
export function startPull(docker: string, logPath: string): void {
  mkdirSync(dirname(logPath), { recursive: true });
  const out = openSync(logPath, "w");
  const child = spawn(docker, ["pull", DETECTOR_IMAGE], {
    detached: true,
    stdio: ["ignore", out, out],
    env: dockerEnv(docker),
  });
  child.unref();
}

export interface PullProgress {
  readonly layers: number;
  readonly done: number;
  readonly finished: boolean;
  /** The docker line explaining the failure, when there is one. */
  readonly error: string | null;
}

const LAYER_LINE = /^([0-9a-f]{12}):\s(.+)$/;
const FAILURE = /error|denied|unauthorized|cannot|no such host/i;

/** Docker writes one line per layer status change when stdout is not a TTY, so
 * counting completed layers is the only progress signal available. */
export function readPullProgress(logPath: string): PullProgress | null {
  let log: string;
  try {
    log = readFileSync(logPath, "utf8");
  } catch {
    return null;
  }

  const status = new Map<string, string>();
  let error: string | null = null;

  for (const raw of log.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;

    const match = LAYER_LINE.exec(line);
    const id = match?.[1];
    const state = match?.[2];
    if (id !== undefined && state !== undefined) {
      status.set(id, state);
      continue;
    }
    // Any non-layer line mentioning a failure is docker giving up, whatever the wording.
    if (error === null && FAILURE.test(line)) error = line;
  }

  let done = 0;
  for (const state of status.values()) {
    if (state.startsWith("Pull complete") || state.startsWith("Already exists"))
      done++;
  }

  return { layers: status.size, done, finished: /^Status: /m.test(log), error };
}

export function containerArgs(patchPath: string, hostPort: number): string[] {
  const env = Object.entries(FLOORS).flatMap(([key, value]) => [
    "-e",
    `${key}=${value}`,
  ]);

  return [
    "run",
    "-d",
    "--name",
    CONTAINER_NAME,
    "--restart",
    "unless-stopped",
    // Loopback only: /analyze is unauthenticated. The published port follows the
    // preference, or the command would poll an address it never bound.
    "-p",
    `127.0.0.1:${hostPort}:${CONTAINER_PORT}`,
    "--read-only",
    "--tmpfs",
    "/tmp",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    // The inherited healthcheck probes a proxy on :3000 that this command never
    // starts, and it cannot be replaced here: the CLI only takes a shell form,
    // and the image ships no shell. Readiness is polled over HTTP instead.
    "--no-healthcheck",
    "-v",
    `${patchPath}:${PATCH_TARGET}:ro`,
    ...env,
    DETECTOR_IMAGE,
    "uvicorn",
    "detector.app:app",
    "--host",
    "0.0.0.0",
    "--port",
    String(CONTAINER_PORT),
  ];
}

export async function startContainer(
  docker: string,
  patchPath: string,
  hostPort: number,
): Promise<void> {
  await run(docker, containerArgs(patchPath, hostPort), {
    timeout: 60_000,
    env: dockerEnv(docker),
  });
}

export async function removeStoppedContainer(docker: string): Promise<void> {
  try {
    await run(docker, ["rm", "-f", CONTAINER_NAME], {
      timeout: 30_000,
      env: dockerEnv(docker),
    });
  } catch {
    // Nothing to remove is the normal case.
  }
}
