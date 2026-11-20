import { environment, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import { readDevice } from "./bindings";
import { ensureRelease } from "./helper-download";
import { HELPER_RELEASE } from "./helper-release";
import * as listener from "./listener";
import { parseStatusFile, statusPath, WaveStatus } from "./status";
import { identifyProblem, ringState } from "./summary";

export type { WaveStatus };

const run = promisify(execFile);

/** The installed extension's folder; the listener removes itself once it's gone. */
export const extensionFolder = () => dirname(environment.assetsPath);

/**
 * The helper to run: one the user installed themselves (the "Helper Path" preference), one
 * built into assets/ (development, scripts/helper-build.sh), or else the pinned release,
 * downloaded and verified on first use.
 */
export async function helperPath(): Promise<string> {
  const { helperPath: own } = getPreferenceValues<Preferences>();
  if (own) {
    if (!existsSync(own)) throw new Error(`No Wave helper at ${own} (Helper Path in the extension's preferences)`);
    return own;
  }
  const built = join(environment.assetsPath, "wave-helper");
  if (existsSync(built)) {
    // Raycast's packaging drops the executable bit.
    listener.ensureExecutable(built);
    return built;
  }
  return ensureRelease(HELPER_RELEASE, environment.supportPath);
}

/** Runs a one-shot helper command; it prints a single JSON line, or `{"error": …}` and exits non-zero. */
async function oneShot<T>(command: "status" | "identify" | "bluetooth", args: string[] = []): Promise<T> {
  let stdout: string;
  try {
    ({ stdout } = await run(await helperPath(), [command, ...args], { timeout: 20_000 }));
  } catch (e) {
    stdout = (e as { stdout?: string }).stdout ?? "";
    if (!stdout) throw e;
  }
  const result = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
  if (result.error) throw new Error(result.error);
  return result as T;
}

/** Battery and device info the listener last read from the ring. No Bluetooth involved. */
export function readPublishedStatus(): WaveStatus | undefined {
  try {
    return parseStatusFile(readFileSync(statusPath(), "utf8"));
  } catch {
    return undefined;
  }
}

/** The listener's log since it last started; enough to see its latest connection event. */
export const readListenerLog = (): string => listener.readLogTail();

export async function getStatus(): Promise<WaveStatus> {
  // While the listener holds the ring, a second connection gets no replies.
  if (!(await listener.isRunning())) return oneShot<WaveStatus>("status");
  const status = readPublishedStatus();
  if (!status) throw new Error("The listener hasn't reported the ring's status yet");
  return status;
}

/** Flash a ring's display; a specific one by address, or the chosen one. */
export async function identify(address?: string): Promise<void> {
  // The listener's ring: go through the listener rather than open a second connection
  // to a ring it holds in API mode.
  const chosen = readDevice()?.address;
  const listenersRing = !address || !chosen || address.toUpperCase() === chosen.toUpperCase();
  if (listenersRing && (await listener.isRunning())) {
    // A signal with no reply: make sure there is a ring to flash before saying it flashed.
    const problem = identifyProblem({ running: true, ring: ringState(readListenerLog()) });
    if (problem) throw new Error(problem);
    return listener.identify();
  }
  await oneShot<{ ok: true }>("identify", address ? ["--address", address] : []);
}

export type NearbyWave = { id: string; name: string; address?: string; rssi?: number; connected: boolean };

export async function scan(): Promise<NearbyWave[]> {
  let stdout: string;
  try {
    ({ stdout } = await run(await helperPath(), ["scan"], { timeout: 15_000 }));
  } catch (e) {
    // The helper exits non-zero with {"error": …}, e.g. "Bluetooth is off"; surface that.
    stdout = (e as { stdout?: string }).stdout ?? "";
    // Killed by the timeout with nothing to say: on a first scan, macOS is usually still
    // waiting for an answer to "Raycast would like to use Bluetooth".
    if (!stdout && (e as { killed?: boolean }).killed) {
      throw new Error(
        "Bluetooth didn't answer; if macOS asked whether Raycast may use Bluetooth, allow it and scan again",
      );
    }
    if (!stdout) throw e;
  }
  const lines = stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const failure = lines.find((x) => x.error);
  if (failure) throw new Error(failure.error);
  return lines as NearbyWave[];
}

/** Turns the Mac's Bluetooth on, the way Softwave's "Clear Bluetooth Cache" does. */
export async function turnOnBluetooth() {
  await oneShot<{ ok: true }>("bluetooth", ["on"]);
  // The listener exits while Bluetooth is off; start it again right away.
  await listener.restart();
}
