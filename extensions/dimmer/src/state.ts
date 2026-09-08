import { environment, getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { withFileLock } from "./file-lock";
import { formatLevelBar, normalizeLevel } from "./level";

export { formatLevelBar, getLevelSegments } from "./level";

export type DimState = {
  enabled: boolean;
  level: number;
  updatedAt: string;
};

const STATE_FILENAME = "state.json";
const STATE_LOCK_FILENAME = "state-update.lock";
const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 2_500;
const HELPER_START_DEBOUNCE_MS = 1_000;

let helperLastStartedAt = 0;

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}

export function getDefaultLevel(): number {
  return normalizeLevel(Number.parseInt(getPreferences().defaultLevel, 10));
}

export function getStep(): number {
  const parsed = Number.parseInt(getPreferences().step, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 10;
}

export function getStatePath(): string {
  return path.join(environment.supportPath, STATE_FILENAME);
}

export async function readState(): Promise<DimState> {
  try {
    const contents = await readFile(getStatePath(), "utf8");
    const value = JSON.parse(contents) as Partial<DimState>;
    const level = normalizeLevel(Number(value.level));

    return {
      enabled: Boolean(value.enabled) && level > 0,
      level,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return {
      enabled: false,
      level: getDefaultLevel(),
      updatedAt: new Date(0).toISOString(),
    };
  }
}

export async function setDimLevel(requestedLevel: number): Promise<DimState> {
  const level = normalizeLevel(requestedLevel);
  return updateState((current) => ({
    enabled: level > 0,
    level: level > 0 ? level : current.level || getDefaultLevel(),
    updatedAt: new Date().toISOString(),
  }));
}

export async function resetDim(): Promise<DimState> {
  return updateState(() => ({
    enabled: false,
    level: getDefaultLevel(),
    updatedAt: new Date().toISOString(),
  }));
}

async function updateState(transform: (current: DimState) => DimState): Promise<DimState> {
  const state = await withStateLock(async () => {
    const nextState = transform(await readState());
    await writeState(nextState);
    return nextState;
  });

  if (state.enabled) {
    await ensureHelperIsRunning();
  }
  await refreshMenuBar();
  return state;
}

export async function toggleDim(): Promise<DimState> {
  return updateState((current) => ({
    enabled: !current.enabled,
    level: current.level || getDefaultLevel(),
    updatedAt: new Date().toISOString(),
  }));
}

export async function dimMore(): Promise<DimState> {
  return updateState((current) => {
    const startingLevel = current.enabled ? current.level : getDefaultLevel();
    const level = normalizeLevel(startingLevel + getStep());
    return {
      enabled: level > 0,
      level,
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function dimLess(): Promise<DimState> {
  return updateState((current) => {
    if (!current.enabled) {
      return current;
    }

    const level = normalizeLevel(current.level - getStep());
    return {
      enabled: level > 0,
      level: level > 0 ? level : current.level,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function describeState(state: DimState): string {
  return state.enabled ? `Screen dimmed by ${state.level}%` : "Dimmer is off";
}

export function describeHUD(state: DimState): string {
  return state.enabled ? `${formatLevelBar(state.level)}  ${state.level}%` : `${formatLevelBar(0)}  Off`;
}

async function writeState(state: DimState): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  const statePath = getStatePath();
  const temporaryPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, statePath);
}

async function withStateLock<T>(operation: () => Promise<T>): Promise<T> {
  const lockPath = path.join(environment.supportPath, STATE_LOCK_FILENAME);
  return withFileLock(lockPath, operation, {
    retryMilliseconds: LOCK_RETRY_MS,
    timeoutMilliseconds: LOCK_TIMEOUT_MS,
  });
}

async function ensureHelperIsRunning(): Promise<void> {
  if (Date.now() - helperLastStartedAt < HELPER_START_DEBOUNCE_MS) {
    return;
  }

  const { startDimmer } = await import("swift:../swift/dimmer-helper");
  await startDimmer(getStatePath());
  helperLastStartedAt = Date.now();
}

async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "dimmer-menu", type: LaunchType.Background });
  } catch {
    // The menu bar command may be disabled or may not have been activated yet.
  }
}
