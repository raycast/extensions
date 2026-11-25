import { showFailureToast } from "@raycast/utils";
import { execFileSync, spawn } from "child_process";
import { chmodSync, closeSync, openSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "fs";
import net from "net";
import path from "path";
import { DaemonRequest, DaemonState, TerminiConfig } from "./types";

const DAEMON_VERSION = "terminid-v6";
const DAEMON_START_ATTEMPTS = 30;
const DAEMON_START_INTERVAL_MS = 100;
const FALLBACK_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";
let lastDaemonCheckAt = 0;
let daemonStartPromise: Promise<void> | undefined;

export async function requestDaemon(config: TerminiConfig, request: DaemonRequest): Promise<DaemonState> {
  try {
    await ensureDaemon(config);
    const response = await sendSocket(config.socketPath, request).catch(async () => {
      lastDaemonCheckAt = 0;
      await restartDaemon(config);
      return sendSocket(config.socketPath, request);
    });

    if (!response.ok && response.error) {
      void showFailureToast(response.error, { title: "Termini daemon error" });
    }

    return { ...response, tabs: response.tabs ?? [] };
  } catch (error) {
    void showFailureToast(error, { title: "Termini daemon error" });
    return { ok: false, error: formatError(error), tabs: [] };
  }
}

async function ensureDaemon(config: TerminiConfig) {
  if (Date.now() - lastDaemonCheckAt < 2000) return;
  const ok = await pingDaemon(config);
  if (!ok) {
    await restartDaemon(config);
    return;
  }
  lastDaemonCheckAt = Date.now();
}

function restartDaemon(config: TerminiConfig) {
  if (!daemonStartPromise) {
    daemonStartPromise = startDaemon(config).finally(() => {
      daemonStartPromise = undefined;
    });
  }
  return daemonStartPromise;
}

async function startDaemon(config: TerminiConfig) {
  writeConfig(config);
  killExistingDaemon(config);
  rmSync(config.pidPath, { force: true });
  rmSync(config.socketPath, { force: true });
  rmSync(`${config.supportPath}/termini.sock`, { force: true });
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

function killExistingDaemon(config: TerminiConfig) {
  try {
    const pid = Number.parseInt(readFileSync(config.pidPath, "utf8"), 10);
    if (Number.isFinite(pid) && pid > 0 && isManagedDaemonPid(pid, config)) process.kill(pid, "SIGTERM");
  } catch {
    // No managed daemon to stop.
  }
  killStaleTerminiDaemons(config);
}

function isManagedDaemonPid(pid: number, config: TerminiConfig) {
  try {
    const command = execFileSync("/bin/ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
      timeout: 1000,
    }).trim();
    return isTerminiDaemonCommand(command, config);
  } catch {
    return false;
  }
}

function killStaleTerminiDaemons(config: TerminiConfig) {
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
    if (!isTerminiDaemonCommand(command, config)) continue;
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // It may have exited between ps and kill.
    }
  }
}

function isTerminiDaemonCommand(command: string, config: TerminiConfig) {
  const isDaemonScript = command.includes("terminid.py") || command.includes("termini_daemon.py");
  if (!isDaemonScript) return false;
  return (
    command.includes(config.configPath) ||
    command.includes(config.supportPath) ||
    command.includes("/extensions/termini/")
  );
}

function pingDaemon(config: TerminiConfig) {
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

function writeConfig(config: TerminiConfig) {
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

function buildDaemonStartError(config: TerminiConfig, spawnError?: Error) {
  const log = readDaemonLog(config);
  const details = [spawnError?.message, log && `daemon log:\n${log}`].filter(Boolean).join("\n");
  return details ? `Failed to start Termini daemon\n${details}` : "Failed to start Termini daemon";
}

function readDaemonLog(config: TerminiConfig) {
  try {
    return readFileSync(config.logPath, "utf8").trim().slice(-3000);
  } catch {
    return "";
  }
}

// Attach a real terminal window to a live session. The daemon keeps owning the PTY, so
// closing that window only detaches; the session carries on in Raycast.
export function openInTerminal(config: TerminiConfig, tabId: string, terminalApp: string) {
  mkdirSync(config.supportPath, { recursive: true });
  const attachScript = path.join(path.dirname(config.daemonPath), "termini-attach.py");
  const commandFile = path.join(config.supportPath, `attach-${tabId.replace(/[^\w-]/g, "_")}.command`);
  const command = [config.pythonPath, attachScript, config.socketPath, tabId].map(shellQuote).join(" ");
  writeFileSync(commandFile, `#!/bin/sh\nclear\nexec ${command}\n`);
  chmodSync(commandFile, 0o755);
  execFileSync("/usr/bin/open", ["-a", terminalApp, commandFile], { timeout: 5000 });
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
