import { environment, getPreferenceValues } from "@raycast/api";
import { execFile, spawn, type SpawnOptions } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, open, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export type Toolchain = {
  adb: string;
  emulator: string;
  scrcpy: string;
};

export type AndroidDevice = {
  serial: string;
  name: string;
  detail?: string;
  isEmulator: boolean;
};

export type EmulatorItem = {
  name: string;
  serial?: string;
};

type OutputPreferences = {
  screenshotDirectory?: string;
  recordingDirectory?: string;
};

const outputPreferences = getPreferenceValues<OutputPreferences>();

export const screenshotDirectory =
  outputPreferences.screenshotDirectory?.trim() ||
  join(homedir(), "Documents", "screenshots");
export const recordingDirectory =
  outputPreferences.recordingDirectory?.trim() ||
  join(homedir(), "Documents", "recordings");
export const emulatorLaunchLogPath = join(
  environment.supportPath,
  "android-emulator-launch.log",
);
export const emulatorLaunchHelperPath = join(
  environment.assetsPath,
  "launch-emulator.sh",
);

export function execute(
  file: string,
  args: string[],
  timeout = 10_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { encoding: "utf8", timeout },
      (error, stdout, stderr) => {
        if (error) {
          const details = stderr.trim() || error.message;
          reject(new Error(`${basename(file)} failed: ${details}`));
        } else {
          resolve(stdout.trim());
        }
      },
    );
  });
}

function executeBinary(
  file: string,
  args: string[],
  timeout = 30_000,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { maxBuffer: 50 * 1024 * 1024, timeout },
      (error, stdout, stderr) => {
        if (error) {
          const details = String(stderr).trim() || error.message;
          reject(new Error(`${basename(file)} failed: ${details}`));
        } else {
          resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout));
        }
      },
    );
  });
}

async function findExecutable(
  label: string,
  candidates: Array<string | undefined>,
) {
  const checked = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate || checked.has(candidate)) continue;
    checked.add(candidate);

    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue through known installation locations before checking PATH.
    }
  }

  try {
    const path = await execute("/usr/bin/which", [label]);
    if (path) return path.split(/\r?\n/, 1)[0];
  } catch {
    // The error below reports the complete resolution failure.
  }

  throw new Error(
    `Could not find ${label}. Install it or add it to PATH, then reopen Raycast.`,
  );
}

let toolchainPromise: Promise<Toolchain> | undefined;

export function getToolchain() {
  if (!toolchainPromise) {
    toolchainPromise = (async () => {
      const sdkRoots = [
        process.env.ANDROID_SDK_ROOT,
        process.env.ANDROID_HOME,
        join(homedir(), "Library", "Android", "sdk"),
      ];

      const [emulator, adb, scrcpy] = await Promise.all([
        findExecutable(
          "emulator",
          sdkRoots.map((root) => root && join(root, "emulator", "emulator")),
        ),
        findExecutable(
          "adb",
          sdkRoots.map((root) => root && join(root, "platform-tools", "adb")),
        ),
        findExecutable("scrcpy", [
          "/opt/homebrew/bin/scrcpy",
          "/usr/local/bin/scrcpy",
        ]),
      ]);

      return { adb, emulator, scrcpy };
    })();
  }

  return toolchainPromise;
}

export async function listAvds(emulator: string) {
  const output = await execute(emulator, ["-list-avds"]);
  return output
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function runningEmulatorSerials(adb: string) {
  const output = await execute(adb, ["devices"]);
  return output
    .split(/\r?\n/)
    .map((line) => line.match(/^(emulator-\d+)\s+device$/)?.[1])
    .filter((serial): serial is string => Boolean(serial));
}

export async function runningAvds(adb: string) {
  const entries = await Promise.all(
    (await runningEmulatorSerials(adb)).map(async (serial) => {
      try {
        const output = await execute(adb, ["-s", serial, "emu", "avd", "name"]);
        const name = output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => line && line !== "OK");
        return name ? ([name, serial] as const) : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  return new Map(
    entries.filter((entry): entry is readonly [string, string] =>
      Boolean(entry),
    ),
  );
}

export async function listConnectedDevices(adb: string) {
  const [output, avds] = await Promise.all([
    execute(adb, ["devices", "-l"]),
    runningAvds(adb),
  ]);
  const avdBySerial = new Map(
    Array.from(avds, ([name, serial]) => [serial, name]),
  );

  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line): AndroidDevice | undefined => {
      const match = line.trim().match(/^(\S+)\s+(\S+)(?:\s+(.*))?$/);
      if (!match || match[2] !== "device") return undefined;

      const [, serial, , attributes = ""] = match;
      const properties = new Map(
        attributes
          .split(/\s+/)
          .map((entry) => entry.split(/:(.*)/s, 2))
          .filter((entry): entry is [string, string] => entry.length === 2),
      );
      const isEmulator = serial.startsWith("emulator-");
      const model = properties.get("model")?.replaceAll("_", " ");
      const name = avdBySerial.get(serial) ?? model ?? serial;
      const product = properties.get("product")?.replaceAll("_", " ");

      return {
        serial,
        name,
        detail: [isEmulator ? "Emulator" : "Physical device", product]
          .filter(Boolean)
          .join(" · "),
        isEmulator,
      };
    })
    .filter((device): device is AndroidDevice => Boolean(device));
}

function canBind(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function nextEmulatorPort(adb: string) {
  const usedPorts = new Set(
    (await runningEmulatorSerials(adb)).map((serial) =>
      Number(serial.slice("emulator-".length)),
    ),
  );

  for (let port = 5554; port <= 5682; port += 2) {
    if (usedPorts.has(port)) continue;
    if ((await canBind(port)) && (await canBind(port + 1))) return port;
  }

  throw new Error(
    "No free Android Emulator port is available between 5554 and 5682.",
  );
}

export function spawnDetached(
  file: string,
  args: string[],
  options: SpawnOptions = {},
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(file, args, { ...options, detached: true });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replace(".", "-");
}

export async function launchScrcpy(
  device: AndroidDevice,
  options: { record?: boolean; showTouches?: boolean } = {},
) {
  const tools = await getToolchain();
  await mkdir(environment.supportPath, { recursive: true });
  await mkdir(recordingDirectory, { recursive: true });

  const suffix = timestamp();
  const safeName = device.name.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
  const recordingPath = options.record
    ? join(recordingDirectory, `${safeName}-${suffix}.mp4`)
    : undefined;
  const logPath = join(environment.supportPath, `scrcpy-${safeName}.log`);
  const log = await open(logPath, "a");
  const args = [
    "-s",
    device.serial,
    "--window-title",
    `scrcpy - ${device.name}`,
  ];

  if (options.showTouches) args.push("--show-touches");
  if (recordingPath) args.push("--record", recordingPath);

  try {
    await spawnDetached(tools.scrcpy, args, {
      env: { ...process.env, ADB: tools.adb },
      stdio: ["ignore", log.fd, log.fd],
    });
  } finally {
    await log.close();
  }

  return { logPath, recordingPath };
}

export async function takeScreenshot(device: AndroidDevice) {
  const { adb } = await getToolchain();
  await mkdir(screenshotDirectory, { recursive: true });
  const safeName = device.name.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
  const outputPath = join(
    screenshotDirectory,
    `${safeName}-${timestamp()}.png`,
  );

  try {
    const screenshot = await executeBinary(adb, [
      "-s",
      device.serial,
      "exec-out",
      "screencap",
      "-p",
    ]);
    await writeFile(outputPath, screenshot);
    return outputPath;
  } catch (error) {
    await unlink(outputPath).catch(() => undefined);
    throw error;
  }
}

export async function setShowTouches(device: AndroidDevice, enabled: boolean) {
  const { adb } = await getToolchain();
  await execute(adb, [
    "-s",
    device.serial,
    "shell",
    "settings",
    "put",
    "system",
    "show_touches",
    enabled ? "1" : "0",
  ]);
}
