import { LocalStorage, environment } from "@raycast/api";
import { spawn, execFile } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const overlayPidKey = "matrix-overlay-pid";
const overlayProcessFlag = "--the-matrix-raycast-overlay";
const overlayStopFileName = "matrix-overlay.stop";
const gracefulStopTimeoutMs = 7400;
const forceStopTimeoutMs = 500;
const matrixDensityValues = ["sparse", "normal", "dense", "overload"] as const;
export type MatrixDensity = (typeof matrixDensityValues)[number];
const defaultMatrixDensity: MatrixDensity = "normal";

type StartResult = {
  alreadyRunning: boolean;
  pid?: number;
};

type StartOptions = {
  matrixDensity?: string;
  soundsOn: boolean;
};

type StopResult = {
  stopped: boolean;
  fallbackCount: number;
};

type RuntimeConfig = {
  electronPath?: string;
  extensionRoot?: string;
};

export async function startOverlay(
  options: StartOptions,
): Promise<StartResult> {
  const storedPid = await getStoredPid();

  if (storedPid && isProcessRunning(storedPid)) {
    return { alreadyRunning: true, pid: storedPid };
  }

  await LocalStorage.removeItem(overlayPidKey);

  const electronPath = await findElectronExecutable();
  const mainScriptPath = path.join(
    environment.assetsPath,
    "overlay",
    "main.js",
  );
  const stopFilePath = getStopFilePath();
  await assertExecutable(electronPath);
  await assertReadable(mainScriptPath);
  await mkdir(environment.supportPath, { recursive: true });
  await rm(stopFilePath, { force: true });

  const child = spawn(
    electronPath,
    [
      mainScriptPath,
      overlayProcessFlag,
      "--stop-file",
      stopFilePath,
      "--audio",
      options.soundsOn ? "1" : "0",
      "--density",
      normalizeMatrixDensity(options.matrixDensity),
    ],
    {
      detached: true,
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      },
      stdio: "ignore",
    },
  );

  child.unref();

  if (!child.pid) {
    throw new Error("Electron overlay launched without a process ID");
  }

  await LocalStorage.setItem(overlayPidKey, String(child.pid));

  return { alreadyRunning: false, pid: child.pid };
}

function normalizeMatrixDensity(value: string | undefined): MatrixDensity {
  return matrixDensityValues.includes(value as MatrixDensity)
    ? (value as MatrixDensity)
    : defaultMatrixDensity;
}

export async function isOverlayRunning(): Promise<boolean> {
  const storedPid = await getStoredPid();

  return Boolean(storedPid && isProcessRunning(storedPid));
}

export async function stopOverlay(): Promise<StopResult> {
  let stopped = false;
  const storedPid = await getStoredPid();

  if (storedPid && isProcessRunning(storedPid)) {
    await requestGracefulStop();
    stopped = true;
    await waitForExit(storedPid, gracefulStopTimeoutMs);

    if (isProcessRunning(storedPid)) {
      process.kill(storedPid, "SIGKILL");
      await waitForExit(storedPid, forceStopTimeoutMs);
    }
  }

  await LocalStorage.removeItem(overlayPidKey);
  await rm(getStopFilePath(), { force: true });

  const fallbackCount = await stopMatchingOverlayProcesses();
  stopped = stopped || fallbackCount > 0;

  return { stopped, fallbackCount };
}

async function requestGracefulStop(): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(getStopFilePath(), String(Date.now()));
}

function getStopFilePath(): string {
  return path.join(environment.supportPath, overlayStopFileName);
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function getStoredPid(): Promise<number | undefined> {
  const value = await LocalStorage.getItem<string>(overlayPidKey);
  const pid = Number(value);

  return Number.isInteger(pid) && pid > 0 ? pid : undefined;
}

async function findElectronExecutable(): Promise<string> {
  const overridePath = process.env.THE_MATRIX_ELECTRON_PATH;

  if (overridePath) {
    return overridePath;
  }

  const runtimeConfig = await getRuntimeConfig();
  const configuredPaths = [
    runtimeConfig.electronPath,
    process.env.THE_MATRIX_EXTENSION_ROOT
      ? getElectronExecutablePath(process.env.THE_MATRIX_EXTENSION_ROOT)
      : undefined,
    runtimeConfig.extensionRoot
      ? getElectronExecutablePath(runtimeConfig.extensionRoot)
      : undefined,
  ].filter((candidatePath): candidatePath is string => Boolean(candidatePath));

  for (const candidatePath of configuredPaths) {
    if (await canAccess(candidatePath)) {
      return candidatePath;
    }
  }

  const roots = getCandidateRoots(runtimeConfig);
  const candidatePaths = roots.flatMap((root) => {
    if (process.platform === "darwin") {
      return [
        getElectronExecutablePath(root),
        path.join(root, "node_modules", ".bin", "electron"),
      ];
    }

    if (process.platform === "win32") {
      return [
        path.join(root, "node_modules", "electron", "dist", "electron.exe"),
        path.join(root, "node_modules", ".bin", "electron.cmd"),
      ];
    }

    return [
      path.join(root, "node_modules", "electron", "dist", "electron"),
      path.join(root, "node_modules", ".bin", "electron"),
    ];
  });

  for (const candidatePath of candidatePaths) {
    if (await canAccess(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    "Electron runtime not found. Run `npm install` in the extension folder first, then restart `npm run dev`.",
  );
}

async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const configPath = path.join(
    environment.assetsPath,
    "overlay",
    "runtime-config.json",
  );

  try {
    return JSON.parse(await readFile(configPath, "utf8")) as RuntimeConfig;
  } catch {
    return {};
  }
}

function getElectronExecutablePath(root: string): string {
  if (process.platform === "darwin") {
    return path.join(
      root,
      "node_modules",
      "electron",
      "dist",
      "Electron.app",
      "Contents",
      "MacOS",
      "Electron",
    );
  }

  if (process.platform === "win32") {
    return path.join(root, "node_modules", "electron", "dist", "electron.exe");
  }

  return path.join(root, "node_modules", "electron", "dist", "electron");
}

function getCandidateRoots(runtimeConfig: RuntimeConfig): string[] {
  const roots = [
    runtimeConfig.extensionRoot,
    process.cwd(),
    path.resolve(environment.assetsPath, ".."),
    path.resolve(environment.assetsPath, "..", ".."),
    path.resolve(environment.assetsPath, "..", "..", ".."),
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "..", ".."),
  ].filter((root): root is string => Boolean(root));

  return [...new Set(roots)];
}

async function assertExecutable(filePath: string): Promise<void> {
  if (!(await canAccess(filePath))) {
    throw new Error(`Cannot execute ${filePath}`);
  }
}

async function assertReadable(filePath: string): Promise<void> {
  if (!(await canAccess(filePath))) {
    throw new Error(`Cannot read ${filePath}`);
  }
}

async function canAccess(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitForExit(pid: number, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!isProcessRunning(pid)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function stopMatchingOverlayProcesses(): Promise<number> {
  if (process.platform === "win32") {
    return 0;
  }

  const matchingPids = await findMatchingOverlayPids();

  for (const pid of matchingPids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignore processes that exited between `ps` and `kill`.
    }
  }

  return matchingPids.length;
}

async function findMatchingOverlayPids(): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync("ps", ["-axo", "pid=,command="]);

    return stdout
      .split("\n")
      .filter((line) => line.includes(overlayProcessFlag))
      .map((line) => Number(line.trim().match(/^(\d+)/)?.[1]))
      .filter((pid) => Number.isInteger(pid) && pid > 0)
      .filter((pid) => pid !== process.pid && pid !== process.ppid);
  } catch {
    return [];
  }
}
