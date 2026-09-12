import { constants } from "node:fs";
import { access, readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const ELSEWHERE_SNAPSHOT_FILENAME = "elsewhere-control-v1.json";
export const ELSEWHERE_USER_DATA_PREFIX = "app.glaze.macos.27b0yt1l";
export const SUPPORTED_SNAPSHOT_SCHEMA_VERSION = 1;

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SPACE_COLOR_PATTERN = /^#[0-9A-F]{6}$/;

export interface ElsewhereNamedItem {
  id: string;
  name: string;
}

export interface ElsewhereDescribedItem extends ElsewhereNamedItem {
  description?: string;
}

export interface ElsewhereSpace extends ElsewhereDescribedItem {
  color?: string;
}

export interface ElsewhereSource extends ElsewhereNamedItem {
  soundId: string;
  enabled: boolean;
}

export interface ElsewhereCommandResult {
  requestId: string | null;
  status: "success" | "error";
  command: string;
  completedAt: string;
  code?: string;
  message?: string;
}

export interface ElsewhereSnapshotV1 {
  schemaVersion: 1;
  appVersion: string;
  running: boolean;
  processId: number;
  instanceId: string;
  updatedAt: string;
  ready: boolean;
  requiresSetup: boolean;
  playing: boolean;
  activeSpaceId: string;
  spaces: ElsewhereSpace[];
  ambienceVolume: number;
  backgroundMusicEnabled: boolean;
  backgroundMusicLoading: boolean;
  activeMusicTrackId: string;
  musicVolume: number;
  musicTracks: ElsewhereDescribedItem[];
  sources: ElsewhereSource[];
  lastCommand: ElsewhereCommandResult | null;
}

export type ElsewhereStateReadResult =
  | {
      kind: "ready";
      snapshot: ElsewhereSnapshotV1;
      snapshotPath: string;
    }
  | {
      kind: "stale";
      snapshot: ElsewhereSnapshotV1;
      snapshotPath: string;
      reason: "stopped" | "process-not-running";
    }
  | {
      kind: "unavailable";
    }
  | {
      kind: "malformed";
      snapshotPath: string;
      message: string;
    }
  | {
      kind: "unsupported";
      snapshotPath: string;
      schemaVersion: number;
    }
  | {
      kind: "error";
      message: string;
    };

interface StateReaderOptions {
  applicationSupportDirectory?: string;
  processIsAlive?: (processId: number) => boolean;
}

type SnapshotParseResult =
  | { kind: "valid"; snapshot: ElsewhereSnapshotV1 }
  | { kind: "malformed"; message: string }
  | { kind: "unsupported"; schemaVersion: number };

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isPercentage(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isIdentifier(value: unknown, allowEmpty = false): value is string {
  return (
    typeof value === "string" &&
    (allowEmpty ? value === "" || IDENTIFIER_PATTERN.test(value) : IDENTIFIER_PATTERN.test(value))
  );
}

function optionalDescription(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const description = value.trim();
  return description.length > 0 ? description : undefined;
}

function parseNamedItems(value: unknown): ElsewhereDescribedItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: ElsewhereDescribedItem[] = [];
  for (const entry of value) {
    if (!isObject(entry) || !isIdentifier(entry.id) || typeof entry.name !== "string" || entry.name.length === 0) {
      return null;
    }
    const description = optionalDescription(entry.description);
    if (description === null) return null;
    items.push({
      id: entry.id,
      name: entry.name,
      ...(description ? { description } : {}),
    });
  }
  return items;
}

function parseSpaces(value: unknown): ElsewhereSpace[] | null {
  if (!Array.isArray(value)) return null;
  const spaces: ElsewhereSpace[] = [];
  for (const entry of value) {
    const description = isObject(entry) ? optionalDescription(entry.description) : null;
    if (
      !isObject(entry) ||
      !isIdentifier(entry.id) ||
      typeof entry.name !== "string" ||
      entry.name.length === 0 ||
      description === null ||
      (entry.color !== undefined && (typeof entry.color !== "string" || !SPACE_COLOR_PATTERN.test(entry.color)))
    ) {
      return null;
    }
    spaces.push({
      id: entry.id,
      name: entry.name,
      ...(description ? { description } : {}),
      ...(typeof entry.color === "string" ? { color: entry.color } : {}),
    });
  }
  return spaces;
}

function parseSources(value: unknown): ElsewhereSource[] | null {
  if (!Array.isArray(value)) return null;
  const sources: ElsewhereSource[] = [];
  for (const entry of value) {
    if (
      !isObject(entry) ||
      !isIdentifier(entry.id) ||
      typeof entry.name !== "string" ||
      entry.name.length === 0 ||
      !isIdentifier(entry.soundId) ||
      typeof entry.enabled !== "boolean"
    ) {
      return null;
    }
    sources.push({
      id: entry.id,
      name: entry.name,
      soundId: entry.soundId,
      enabled: entry.enabled,
    });
  }
  return sources;
}

function parseLastCommand(value: unknown): ElsewhereCommandResult | null | undefined {
  if (value === null) return null;
  if (
    !isObject(value) ||
    (value.requestId !== null && (typeof value.requestId !== "string" || !REQUEST_ID_PATTERN.test(value.requestId))) ||
    (value.status !== "success" && value.status !== "error") ||
    typeof value.command !== "string" ||
    !isIsoDate(value.completedAt) ||
    (value.code !== undefined && typeof value.code !== "string") ||
    (value.message !== undefined && typeof value.message !== "string")
  ) {
    return undefined;
  }

  return {
    requestId: value.requestId,
    status: value.status,
    command: value.command,
    completedAt: value.completedAt,
    ...(typeof value.code === "string" ? { code: value.code } : {}),
    ...(typeof value.message === "string" ? { message: value.message } : {}),
  };
}

export function parseElsewhereSnapshot(value: unknown): SnapshotParseResult {
  if (!isObject(value)) return { kind: "malformed", message: "The snapshot root must be a JSON object." };

  if (typeof value.schemaVersion !== "number" || !Number.isInteger(value.schemaVersion)) {
    return { kind: "malformed", message: "The snapshot has no valid schemaVersion." };
  }
  if (value.schemaVersion !== SUPPORTED_SNAPSHOT_SCHEMA_VERSION) {
    return { kind: "unsupported", schemaVersion: value.schemaVersion };
  }

  const spaces = parseSpaces(value.spaces);
  const musicTracks = parseNamedItems(value.musicTracks);
  const sources = parseSources(value.sources);
  const lastCommand = parseLastCommand(value.lastCommand);

  if (
    typeof value.appVersion !== "string" ||
    value.appVersion.length === 0 ||
    typeof value.running !== "boolean" ||
    typeof value.processId !== "number" ||
    !Number.isSafeInteger(value.processId) ||
    value.processId <= 0 ||
    !isIdentifier(value.instanceId) ||
    !isIsoDate(value.updatedAt) ||
    typeof value.ready !== "boolean" ||
    typeof value.requiresSetup !== "boolean" ||
    typeof value.playing !== "boolean" ||
    !isIdentifier(value.activeSpaceId, true) ||
    !spaces ||
    !isPercentage(value.ambienceVolume) ||
    typeof value.backgroundMusicEnabled !== "boolean" ||
    typeof value.backgroundMusicLoading !== "boolean" ||
    !isIdentifier(value.activeMusicTrackId, true) ||
    !isPercentage(value.musicVolume) ||
    !musicTracks ||
    !sources ||
    lastCommand === undefined
  ) {
    return { kind: "malformed", message: "The schema v1 snapshot contains invalid or missing fields." };
  }

  return {
    kind: "valid",
    snapshot: {
      schemaVersion: 1,
      appVersion: value.appVersion,
      running: value.running,
      processId: value.processId,
      instanceId: value.instanceId,
      updatedAt: value.updatedAt,
      ready: value.ready,
      requiresSetup: value.requiresSetup,
      playing: value.playing,
      activeSpaceId: value.activeSpaceId,
      spaces,
      ambienceVolume: value.ambienceVolume,
      backgroundMusicEnabled: value.backgroundMusicEnabled,
      backgroundMusicLoading: value.backgroundMusicLoading,
      activeMusicTrackId: value.activeMusicTrackId,
      musicVolume: value.musicVolume,
      musicTracks,
      sources,
      lastCommand,
    },
  };
}

function defaultProcessIsAlive(processId: number): boolean {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return isObject(error) && error.code === "EPERM";
  }
}

async function candidateSnapshotPaths(applicationSupportDirectory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(applicationSupportDirectory, { withFileTypes: true });
  } catch (error) {
    if (isObject(error) && error.code === "ENOENT") return [];
    throw error;
  }

  const candidates = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (entry.name === ELSEWHERE_USER_DATA_PREFIX || entry.name.startsWith(`${ELSEWHERE_USER_DATA_PREFIX}-`)),
    )
    .map((entry) => path.join(applicationSupportDirectory, entry.name, ELSEWHERE_SNAPSHOT_FILENAME));

  const existing: string[] = [];
  await Promise.all(
    candidates.map(async (candidate) => {
      try {
        await access(candidate, constants.R_OK);
        existing.push(candidate);
      } catch {
        // A matching app-data directory does not necessarily contain a snapshot yet.
      }
    }),
  );
  return existing;
}

export async function readElsewhereState(options: StateReaderOptions = {}): Promise<ElsewhereStateReadResult> {
  const applicationSupportDirectory =
    options.applicationSupportDirectory ?? path.join(homedir(), "Library", "Application Support");
  const processIsAlive = options.processIsAlive ?? defaultProcessIsAlive;
  let paths: string[];
  try {
    paths = await candidateSnapshotPaths(applicationSupportDirectory);
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "The Elsewhere state directory could not be read.",
    };
  }
  if (paths.length === 0) return { kind: "unavailable" };

  const valid: Array<{ snapshot: ElsewhereSnapshotV1; snapshotPath: string; processAlive: boolean }> = [];
  const malformed: Array<{ snapshotPath: string; message: string }> = [];
  const unsupported: Array<{ snapshotPath: string; schemaVersion: number }> = [];

  await Promise.all(
    paths.map(async (snapshotPath) => {
      try {
        const raw = await readFile(snapshotPath, "utf8");
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          malformed.push({ snapshotPath, message: "The snapshot is not valid JSON." });
          return;
        }

        const parsed = parseElsewhereSnapshot(json);
        if (parsed.kind === "valid") {
          valid.push({
            snapshot: parsed.snapshot,
            snapshotPath,
            processAlive: processIsAlive(parsed.snapshot.processId),
          });
        } else if (parsed.kind === "unsupported") {
          unsupported.push({ snapshotPath, schemaVersion: parsed.schemaVersion });
        } else {
          malformed.push({ snapshotPath, message: parsed.message });
        }
      } catch (error) {
        malformed.push({
          snapshotPath,
          message: error instanceof Error ? error.message : "The snapshot could not be read.",
        });
      }
    }),
  );

  valid.sort((left, right) => Date.parse(right.snapshot.updatedAt) - Date.parse(left.snapshot.updatedAt));
  const current = valid.find((entry) => entry.snapshot.running && entry.processAlive) ?? valid[0];
  if (current) {
    if (!current.snapshot.running) {
      return { kind: "stale", snapshot: current.snapshot, snapshotPath: current.snapshotPath, reason: "stopped" };
    }
    if (!current.processAlive) {
      return {
        kind: "stale",
        snapshot: current.snapshot,
        snapshotPath: current.snapshotPath,
        reason: "process-not-running",
      };
    }
    return { kind: "ready", snapshot: current.snapshot, snapshotPath: current.snapshotPath };
  }

  const newestUnsupported = unsupported[0];
  if (newestUnsupported) return { kind: "unsupported", ...newestUnsupported };
  const firstMalformed = malformed[0];
  if (firstMalformed) return { kind: "malformed", ...firstMalformed };
  return { kind: "unavailable" };
}
