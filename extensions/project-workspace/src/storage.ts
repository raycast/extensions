import { LocalStorage } from "@raycast/api";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { ProjectOverride, ProjectRecord, ScanPreferences, ScanRoot, STORAGE_VERSION, StorageState } from "./types";

const STORAGE_KEY = "projects.state.v1";
const PROJECT_CACHE_KEY = "projects.cache.v1";

export function createDefaultStorageState(): StorageState {
  return {
    version: STORAGE_VERSION,
    scanRoots: [],
    projectOverrides: {},
  };
}

export function createStableId(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}

export function expandHome(inputPath: string): string {
  if (inputPath === "~") {
    return os.homedir();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return inputPath;
}

export async function normalizePath(inputPath: string): Promise<string> {
  const expandedPath = expandHome(inputPath.trim());
  const resolvedPath = path.resolve(expandedPath);

  try {
    return await fs.realpath(resolvedPath);
  } catch {
    return resolvedPath;
  }
}

export async function loadStorageState(): Promise<StorageState> {
  const storedValue = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (!storedValue) {
    return createDefaultStorageState();
  }

  const parsedValue = JSON.parse(storedValue) as Partial<StorageState>;
  return sanitizeStorageState(parsedValue);
}

export async function saveStorageState(state: StorageState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeStorageState(state)));
}

export function parseScanRootInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export async function saveScanRoots(inputPaths: string[]): Promise<StorageState> {
  const state = await loadStorageState();
  const now = new Date().toISOString();
  const existingRootsByPath = new Map(state.scanRoots.map((root) => [root.path, root]));
  const normalizedPaths: string[] = [];

  for (const inputPath of inputPaths) {
    const trimmedPath = inputPath.trim();

    if (!trimmedPath) {
      continue;
    }

    const normalizedPath = await normalizePath(trimmedPath);
    const stat = await fs.stat(normalizedPath);

    if (!stat.isDirectory()) {
      throw new Error(`${normalizedPath} is not a directory`);
    }

    if (!normalizedPaths.includes(normalizedPath)) {
      normalizedPaths.push(normalizedPath);
    }
  }

  const scanRoots = normalizedPaths.map<ScanRoot>((rootPath) => {
    const existingRoot = existingRootsByPath.get(rootPath);

    return {
      id: existingRoot?.id ?? createStableId(`root:${rootPath}`),
      path: rootPath,
      label: existingRoot?.label ?? path.basename(rootPath),
      enabled: true,
      maxDepth: existingRoot?.maxDepth,
      createdAt: existingRoot?.createdAt ?? now,
      updatedAt: now,
    };
  });

  const nextState: StorageState = {
    ...state,
    scanRoots,
  };

  await saveStorageState(nextState);
  return nextState;
}

export async function seedScanRootsFromPreference(preferenceValue: string): Promise<StorageState> {
  const parsedPaths = parseScanRootInput(preferenceValue);

  if (parsedPaths.length === 0) {
    return loadStorageState();
  }

  const state = await loadStorageState();

  if (state.scanRoots.length > 0) {
    return state;
  }

  return saveScanRoots(parsedPaths);
}

export async function seedScanRootsFromPreferences(preferences: ScanPreferences): Promise<StorageState> {
  const parsedPaths = Array.from(
    new Set(
      [preferences.initialScanRoot, ...parseScanRootInput(preferences.additionalScanRoots ?? "")].filter(Boolean),
    ),
  );

  if (parsedPaths.length === 0) {
    return loadStorageState();
  }

  const state = await loadStorageState();

  if (state.scanRoots.length > 0) {
    return state;
  }

  return saveScanRoots(parsedPaths);
}

export async function loadProjectCache(): Promise<ProjectRecord[]> {
  const storedValue = await LocalStorage.getItem<string>(PROJECT_CACHE_KEY);

  if (!storedValue) {
    return [];
  }

  const parsedValue = JSON.parse(storedValue) as unknown;
  return Array.isArray(parsedValue) ? (parsedValue as ProjectRecord[]) : [];
}

export async function saveProjectCache(projects: ProjectRecord[]): Promise<void> {
  await LocalStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify(projects));
}

export async function upsertProjectOverride(projectId: string, patch: ProjectOverride): Promise<StorageState> {
  const state = await loadStorageState();
  const nextOverride = compactProjectOverride({
    ...state.projectOverrides[projectId],
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  const nextState: StorageState = {
    ...state,
    projectOverrides: {
      ...state.projectOverrides,
      [projectId]: nextOverride,
    },
  };

  await saveStorageState(nextState);
  return nextState;
}

function sanitizeStorageState(value: Partial<StorageState>): StorageState {
  const defaultState = createDefaultStorageState();

  return {
    version: STORAGE_VERSION,
    scanRoots: Array.isArray(value.scanRoots) ? value.scanRoots.map(sanitizeScanRoot).filter(Boolean) : [],
    projectOverrides: isRecord(value.projectOverrides)
      ? Object.fromEntries(
          Object.entries(value.projectOverrides).map(([projectId, override]) => [
            projectId,
            compactProjectOverride(override as ProjectOverride),
          ]),
        )
      : defaultState.projectOverrides,
  };
}

function sanitizeScanRoot(root: ScanRoot): ScanRoot {
  const now = new Date().toISOString();

  return {
    id: typeof root.id === "string" ? root.id : createStableId(`root:${root.path}`),
    path: root.path,
    label: root.label || path.basename(root.path),
    enabled: root.enabled !== false,
    maxDepth: typeof root.maxDepth === "number" ? root.maxDepth : undefined,
    createdAt: root.createdAt || now,
    updatedAt: root.updatedAt || now,
  };
}

function compactProjectOverride(override: ProjectOverride): ProjectOverride {
  const nextOverride: ProjectOverride = {};

  if (override.displayName?.trim()) {
    nextOverride.displayName = override.displayName.trim();
  }

  if (override.description?.trim()) {
    nextOverride.description = override.description.trim();
  }

  if (override.urls?.length) {
    nextOverride.urls = Array.from(new Set(override.urls.map((url) => url.trim()).filter(Boolean)));
  }

  if (override.pinned) {
    nextOverride.pinned = true;
  }

  if (override.archived) {
    nextOverride.archived = true;
  }

  if (override.ideAppPath?.trim()) {
    nextOverride.ideAppPath = override.ideAppPath.trim();
  }

  if (override.terminalAppPath?.trim()) {
    nextOverride.terminalAppPath = override.terminalAppPath.trim();
  }

  if (override.updatedAt) {
    nextOverride.updatedAt = override.updatedAt;
  }

  return nextOverride;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
