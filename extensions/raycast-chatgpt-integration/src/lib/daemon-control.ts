import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { daemonLogPath, daemonPidPath } from "./paths.js";
import { ensureAppDir, fileExists } from "./config.js";
import { OAUTH_ENV_KEY } from "./oauth-credentials.js";

export type DaemonStatus = {
  running: boolean;
  pid?: number;
  logPath: string;
};

async function readPid(): Promise<number | null> {
  try {
    const raw = await fs.readFile(daemonPidPath(), "utf8");
    const pid = Number(raw.trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function getDaemonStatus(): Promise<DaemonStatus> {
  const pid = await readPid();
  if (!pid || !isProcessRunning(pid)) {
    return { running: false, logPath: daemonLogPath() };
  }
  return { running: true, pid, logPath: daemonLogPath() };
}

export async function stopDaemon(): Promise<boolean> {
  const status = await getDaemonStatus();
  if (!status.running || !status.pid) {
    await fs.rm(daemonPidPath(), { force: true });
    return false;
  }
  process.kill(status.pid, "SIGTERM");
  await fs.rm(daemonPidPath(), { force: true });
  return true;
}

export async function startDaemon(params: {
  port: number;
  token: string;
  credentials: string;
}): Promise<DaemonStatus> {
  const status = await getDaemonStatus();
  if (status.running) {
    return status;
  }

  await ensureAppDir();
  const commandDir =
    typeof __dirname === "string"
      ? __dirname
      : path.dirname(process.argv[1] ?? process.cwd());
  const candidates = [
    path.join(commandDir, "assets", "daemon-dist", "server.cjs"),
    path.join(process.cwd(), "assets", "daemon-dist", "server.cjs"),
    path.join(process.cwd(), "dist-daemon", "daemon", "server.js"),
  ];
  let resolvedEntry = candidates[0];
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      resolvedEntry = candidate;
      break;
    }
  }
  if (!(await fileExists(resolvedEntry))) {
    throw new Error(
      `Daemon is not packaged. Run "npm run dev" or "npm run build". Checked: ${candidates.join(", ")}`,
    );
  }

  const log = createWriteStream(daemonLogPath(), { flags: "a" });
  const child = spawn(process.execPath, [resolvedEntry], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      RAYCAST_CHATGPT_PROXY_PORT: String(params.port),
      RAYCAST_CHATGPT_PROXY_TOKEN: params.token,
      [OAUTH_ENV_KEY]: params.credentials,
    },
  });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  child.unref();
  await fs.writeFile(daemonPidPath(), String(child.pid), { mode: 0o600 });
  return { running: true, pid: child.pid, logPath: daemonLogPath() };
}

export async function pingDaemon(
  port: number,
  token: string,
): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}
