/**
 * Everything install detection, one-click HTTP server setup (edit ini + restart),
 * and winget install. Node built-ins only.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pingEverything } from "./everything.js";

export interface EverythingStatus {
  httpOk: boolean;
  installed: boolean;
  exePath?: string;
  iniPath?: string;
}

const COMMON_EXE_PATHS = [
  path.join("C:", "Program Files", "Everything", "Everything.exe"),
  path.join("C:", "Program Files (x86)", "Everything", "Everything.exe"),
  path.join(
    os.homedir(),
    "AppData",
    "Local",
    "Programs",
    "Everything",
    "Everything.exe",
  ),
];

/** Find the install dir from the uninstall registry keys */
function findInstallLocationFromRegistry(): string | undefined {
  const keys = [
    "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Everything",
    "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Everything",
    "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Everything",
  ];
  for (const key of keys) {
    try {
      const r = spawnSync("reg.exe", ["query", key, "/v", "InstallLocation"], {
        encoding: "utf8",
        timeout: 5000,
      });
      if (r.status === 0 && r.stdout) {
        const m = r.stdout.match(/InstallLocation\s+REG_SZ\s+(.*)/i);
        const loc = m?.[1]?.trim();
        if (loc) {
          const exe = path.join(loc, "Everything.exe");
          if (fs.existsSync(exe)) return exe;
        }
      }
    } catch {
      // ignore and try the next key
    }
  }
  return undefined;
}

export function findEverythingExe(): string | undefined {
  for (const p of COMMON_EXE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return findInstallLocationFromRegistry();
}

/** Prefer %APPDATA%\Everything\Everything.ini; fall back next to the exe (portable) */
export function findEverythingIni(exePath?: string): string | undefined {
  const appDataIni = path.join(
    process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
    "Everything",
    "Everything.ini",
  );
  if (fs.existsSync(appDataIni)) return appDataIni;
  if (exePath) {
    const portableIni = path.join(path.dirname(exePath), "Everything.ini");
    if (fs.existsSync(portableIni)) return portableIni;
  }
  return undefined;
}

export async function detectEverything(
  host: string,
  port: number,
): Promise<EverythingStatus> {
  const httpOk = await pingEverything(host, port);
  const exePath = findEverythingExe();
  const iniPath = findEverythingIni(exePath);
  return { httpOk, installed: !!exePath, exePath, iniPath };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Enable the HTTP server via the ini (enabled=1, port, loopback only), then restart Everything.
 * Returns an error string, or undefined on success.
 */
export async function ensureHttpServer(
  port = 8085,
): Promise<string | undefined> {
  const exePath = findEverythingExe();
  if (!exePath)
    return "Everything.exe not found — please install Everything first";

  // Everything flushes config back to the ini on exit: quit before editing
  try {
    spawn(exePath, ["-exit"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  } catch {
    // Sends -exit to a running instance; harmless when not running
  }
  await sleep(1500);

  const iniPath = findEverythingIni(exePath);
  if (!iniPath) {
    // Never ran: start once so the ini gets created, then EXIT that instance —
    // a running Everything flushes its in-memory settings back to the ini on
    // exit and would overwrite our edit, leaving the HTTP server off
    spawn(exePath, ["-startup"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    await sleep(2500);
    const ini = findEverythingIni(exePath);
    if (!ini)
      return "Everything.ini not found — run Everything once manually, then retry";
    spawn(exePath, ["-exit"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    await sleep(1500);
    return writeIniAndRestart(ini, exePath, port);
  }
  return writeIniAndRestart(iniPath, exePath, port);
}

async function writeIniAndRestart(
  iniPath: string,
  exePath: string,
  port: number,
): Promise<string | undefined> {
  try {
    const raw = fs.readFileSync(iniPath, "utf8");
    // Replace existing keys, and INSERT them when absent — a fresh ini may not
    // contain the http_server_* keys at all, in which case the loopback-only
    // binding would never be applied
    const wanted: Record<string, string> = {
      http_server_enabled: "1",
      http_server_port: String(port),
      http_server_bindings: "127.0.0.1",
    };
    const seen = new Set<string>();
    const lines = raw.split(/\r?\n/).map((line) => {
      for (const [key, value] of Object.entries(wanted)) {
        if (line.startsWith(`${key}=`)) {
          seen.add(key);
          return `${key}=${value}`;
        }
      }
      return line;
    });
    for (const [key, value] of Object.entries(wanted)) {
      if (!seen.has(key)) lines.push(`${key}=${value}`);
    }
    fs.writeFileSync(iniPath, lines.join("\r\n"), "utf8");
  } catch (e) {
    return `Failed to write config: ${e instanceof Error ? e.message : String(e)}`;
  }

  spawn(exePath, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();

  // Wait for the server (big indexes can take a few seconds)
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    if (await pingEverything("127.0.0.1", port)) return undefined;
  }
  return `Everything restarted, but port ${port} is still unreachable; check Everything Options > HTTP server and confirm the port`;
}

/** Run winget asynchronously — a synchronous spawn would block the JS thread
 * and freeze the command's UI for the whole (possibly minutes-long) install. */
function runWinget(args: string[], timeoutMs: number): Promise<number | null> {
  return new Promise((resolve) => {
    const child = spawn("winget.exe", args, { shell: true, windowsHide: true });
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on("error", () => {
      clearTimeout(timer);
      resolve(-1);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

/** Install Everything via winget, then enable the HTTP server. Returns an error string or undefined. */
export async function installEverythingAndEnableHttp(
  port = 8085,
): Promise<string | undefined> {
  const code = await runWinget(
    [
      "install",
      "-e",
      "--id",
      "voidtools.Everything",
      "--silent",
      "--accept-source-agreements",
      "--accept-package-agreements",
    ],
    600_000,
  );
  // The winget installer auto-starts Everything
  if (code !== 0 || !findEverythingExe()) {
    return `winget install failed (exit ${code}); install manually from https://www.voidtools.com/downloads/`;
  }
  await sleep(1500);
  return ensureHttpServer(port);
}

export const MANUAL_SETUP_GUIDE = [
  "To enable the Everything HTTP server manually:",
  "1. Right-click the Everything tray icon > Options (or press Ctrl+P)",
  "2. Open the HTTP Server tab",
  "3. Check Enable HTTP server, set port 8085, bind to 127.0.0.1",
  "4. Confirm, then come back and re-run Detect Everything",
].join("\n");
