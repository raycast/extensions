import { environment, getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

export type DimState = {
  enabled: boolean;
  level: number;
  updatedAt: string;
};

const STATE_FILENAME = "state.json";
const HELPER_FILENAME = "dimmer-helper";
const LEVEL_SEGMENTS = 10;

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
  const current = level === 0 ? await readState() : undefined;
  const state: DimState = {
    enabled: level > 0,
    level: level > 0 ? level : current?.level || getDefaultLevel(),
    updatedAt: new Date().toISOString(),
  };

  return applyState(state);
}

export async function resetDim(): Promise<DimState> {
  return applyState({
    enabled: false,
    level: getDefaultLevel(),
    updatedAt: new Date().toISOString(),
  });
}

async function applyState(state: DimState): Promise<DimState> {
  await writeState(state);
  if (state.enabled) {
    await ensureHelperIsRunning();
  }
  await refreshMenuBar();
  return state;
}

export async function toggleDim(): Promise<DimState> {
  const current = await readState();
  return setDimLevel(current.enabled ? 0 : current.level || getDefaultLevel());
}

export async function dimMore(): Promise<DimState> {
  const current = await readState();
  const startingLevel = current.enabled ? current.level : getDefaultLevel();
  return setDimLevel(startingLevel + getStep());
}

export async function dimLess(): Promise<DimState> {
  const current = await readState();
  if (!current.enabled) {
    return current;
  }
  return setDimLevel(current.level - getStep());
}

export function describeState(state: DimState): string {
  return state.enabled ? `Screen dimmed by ${state.level}%` : "Dimmer is off";
}

export function describeHUD(state: DimState): string {
  return state.enabled ? `${formatLevelBar(state.level)}  ${state.level}%` : `${formatLevelBar(0)}  Off`;
}

export function formatLevelBar(level: number): string {
  const filledSegments = Math.min(LEVEL_SEGMENTS, Math.max(0, Math.round(normalizeLevel(level) / 10)));
  return `${"●".repeat(filledSegments)}${"○".repeat(LEVEL_SEGMENTS - filledSegments)}`;
}

async function writeState(state: DimState): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  const statePath = getStatePath();
  const temporaryPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, statePath);
}

async function ensureHelperIsRunning(): Promise<void> {
  const helperPath = path.join(environment.assetsPath, HELPER_FILENAME);
  await chmod(helperPath, 0o755);

  const child = spawn(helperPath, ["--state", getStatePath()], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "dimmer-menu", type: LaunchType.Background });
  } catch {
    // The menu bar command may be disabled or may not have been activated yet.
  }
}

function normalizeLevel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(90, Math.round(value)));
}
