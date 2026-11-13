import { environment } from "@raycast/api";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ResolvedPreferences } from "./preferences";
import {
  CONFIG_VERSION,
  CONTROL_PORT,
  EXTENSION_ID,
  type ServiceConfig,
} from "./types";

/** Panel-side choices that are not Raycast preferences. */
export type PanelState = {
  /** IPv4 address of the interface the user picked. */
  host?: string;
};

export function configPath(): string {
  return path.join(environment.supportPath, "config.json");
}

export function statePath(): string {
  return path.join(environment.supportPath, "state.json");
}

export function listPath(): string {
  return path.join(environment.supportPath, "list.json");
}

export function qrPath(): string {
  return path.join(environment.supportPath, "qr.png");
}

export async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

let writeChain: Promise<unknown> = Promise.resolve();

/**
 * Writes via a temporary file plus an atomic rename so a reader never sees a half-written document. Writes are
 * queued and the temporary name carries a random suffix: two writes within the same millisecond used to share a
 * temporary path, and the second rename then failed with ENOENT because the first one had already moved it away.
 */
export async function writeJsonAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  const run = writeChain.then(() => writeJsonAtomicNow(filePath, value));
  writeChain = run.catch(() => undefined);
  return run;
}

async function writeJsonAtomicNow(
  filePath: string,
  value: unknown,
): Promise<void> {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  const unique = `${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
  const temporary = path.join(
    directory,
    `.${path.basename(filePath)}.${unique}.tmp`,
  );
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

export async function loadPanelState(): Promise<PanelState> {
  const state = await readJson<PanelState>(statePath());
  return { host: state?.host };
}

export async function savePanelState(state: PanelState): Promise<void> {
  await writeJsonAtomic(statePath(), state);
}

/**
 * Writes the file both sides share. The extension writes the settings, the service re-reads them on every
 * request, which is what makes the receiving directory change apply without a restart.
 */
export async function syncServiceConfig(input: {
  preferences: ResolvedPreferences;
  host: string;
}): Promise<ServiceConfig> {
  const config: ServiceConfig = {
    version: CONFIG_VERSION,
    extension: EXTENSION_ID,
    controlPort: CONTROL_PORT,
    port: input.preferences.port,
    host: input.host,
    receiveDirectory: input.preferences.receiveDirectory,
    assetsPath: environment.assetsPath,
    hostPid: process.ppid,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonAtomic(configPath(), config);
  return config;
}
