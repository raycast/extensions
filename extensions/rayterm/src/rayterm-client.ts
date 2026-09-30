import { Toast, showToast } from "@raycast/api";
import { execFileSync, spawn } from "child_process";
import { closeSync, openSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "fs";
import net from "net";
import { DaemonRequest, DaemonState, RaytermConfig } from "./types";

const DAEMON_VERSION = "raytermd-v2";
const DAEMON_START_ATTEMPTS = 30;
const DAEMON_START_INTERVAL_MS = 100;
const FALLBACK_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";
let lastDaemonCheckAt = 0;
let daemonStartPromise: Promise<void> | undefined;

export async function requestDaemon(config: RaytermConfig, request: DaemonRequest): Promise<DaemonState> {
  try {
    await ensureDaemon(config);
    const response = await sendSocket(config.socketPath, request).catch(async () => {
      lastDaemonCheckAt = 0;
      await restartDaemon(config);
      return sendSocket(config.socketPath, request);
    });

    if (!response.ok && response.error) {
      void showToast({ style: Toast.Style.Failure, title: "RayTerm daemon error", message: response.error });
    }

    return { ...response, tabs: response.tabs ?? [] };
  } catch (error) {
    const message = formatError(error);
    void showToast({ style: Toast.Style.Failure, title: "RayTerm daemon error", message });
    return { ok: false, error: message, tabs: [] };
  }
}

async function ensureDaemon(config: RaytermConfig) {
  if (Date.now() - lastDaemonCheckAt < 2000) return;
  const ok = await pingDaemon(config);
  if (!ok) {
    await restartDaemon(config);
    return;
  }
  lastDaemonCheckAt = Date.now();
}

function restartDaemon(config: RaytermConfig) {
  if (!daemonStartPromise) {
    daemonStartPromise = startDaemon(config).finally(() => {
      daemonStartPromise = undefined;
    });
  }
  return daemonStartPromise;
}

async function startDaemon(config: RaytermConfig) {
  writeConfig(config);
  killExistingDaemon(config);
  rmSync(config.pidPath, { force: true });
  rmSync(config.socketPath, { force: true });
  rmSync(`${config.supportPath}/rayterm.sock`, { force: true });
  writeFileSync(config.logPath, "");
  await sleep(50);

  const logFd = openSync(config.logPath, "a");
  let spawnError: Error | undefined;
  const child = spawn(config.pythonPath, ["-u", config.daemonPath, config.configPath, config.socketPath], {
    cwd: config.workingDirectory,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...process.env,
      PATH: process.env.PATH ? `${process.env.PATH}:${FALLBACK_PATH}` : FALLBACK_PATH,
      LANG: process.env.LANG || "C.UTF-8",
      LC_ALL: process.env.LC_ALL || "C.UTF-8",
    },
  });
  closeSync(logFd);
  child.once("error", (error) => {
    spawnError = error;
  });
  if (child.pid) writeFileSync(config.pidPath, String(child.pid));
  child.unref();

  for (let attempt = 0; attempt < DAEMON_START_ATTEMPTS; attempt += 1) {
    if (spawnError) break;
    const ok = await pingDaemon(config);
    if (ok) {
      lastDaemonCheckAt = Date.now();
      return;
    }
    await sleep(DAEMON_START_INTERVAL_MS);
  }

  throw new Error(buildDaemonStartError(config, spawnError));
}

function killExistingDaemon(config: RaytermConfig) {
  try {
    const pid = Number.parseInt(readFileSync(config.pidPath, "utf8"), 10);
    if (Number.isFinite(pid) && pid > 0 && isManagedDaemonPid(pid, config)) process.kill(pid, "SIGTERM");
  } catch {
    // No managed daemon to stop.
  }
  killStaleRaytermDaemons(config);
}

function isManagedDaemonPid(pid: number, config: RaytermConfig) {
  try {
    const command = execFileSync("/bin/ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
      timeout: 1000,
    }).trim();
    return isRaytermDaemonCommand(command, config);
  } catch {
    return false;
  }
}

function killStaleRaytermDaemons(config: RaytermConfig) {
  let output = "";
  try {
    output = execFileSync("/bin/ps", ["-axo", "pid=,command="], { encoding: "utf8", timeout: 1000 });
  } catch {
    return;
  }

  for (const line of output.split("\n")) {
    const match = line.trim().match(/^(\d+)\s+(.*)$/);
    if (!match) continue;
    const pid = Number.parseInt(match[1], 10);
    const command = match[2];
    if (!Number.isFinite(pid) || pid <= 1 || pid === process.pid) continue;
    if (!isRaytermDaemonCommand(command, config)) continue;
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // It may have exited between ps and kill.
    }
  }
}

function isRaytermDaemonCommand(command: string, config: RaytermConfig) {
  const isDaemonScript = command.includes("raytermd.py") || command.includes("rayterm_daemon.py");
  if (!isDaemonScript) return false;
  return (
    command.includes(config.configPath) ||
    command.includes(config.supportPath) ||
    command.includes("/extensions/rayterm/")
  );
}

function pingDaemon(config: RaytermConfig) {
  return sendSocket(config.socketPath, { command: "ping" })
    .then((response) => Boolean(response.ok) && response.version === DAEMON_VERSION)
    .catch(() => false);
}

function sendSocket(socketPath: string, request: DaemonRequest) {
  return new Promise<DaemonState>((resolve, reject) => {
    const client = net.createConnection(socketPath);
    let data = "";
    client.setEncoding("utf8");
    client.on("connect", () => client.end(JSON.stringify(request)));
    client.on("data", (chunk) => {
      data += chunk;
    });
    client.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}") as DaemonState);
      } catch (error) {
        reject(error);
      }
    });
    client.on("error", reject);
  });
}

function writeConfig(config: RaytermConfig) {
  mkdirSync(config.supportPath, { recursive: true });
  writeFileSync(
    config.configPath,
    JSON.stringify(
      {
        shellPath: config.shellPath,
        shellArgs: config.shellArgs,
        workingDirectory: config.workingDirectory,
        visibleTerminalLines: config.visibleTerminalLines,
        terminalColumns: config.terminalColumns,
        maxTranscriptLines: config.maxTranscriptLines,
      },
      null,
      2,
    ),
  );
}

function buildDaemonStartError(config: RaytermConfig, spawnError?: Error) {
  const log = readDaemonLog(config);
  const details = [spawnError?.message, log && `daemon log:\n${log}`].filter(Boolean).join("\n");
  return details ? `Failed to start RayTerm daemon\n${details}` : "Failed to start RayTerm daemon";
}

function readDaemonLog(config: RaytermConfig) {
  try {
    return readFileSync(config.logPath, "utf8").trim().slice(-3000);
  } catch {
    return "";
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
