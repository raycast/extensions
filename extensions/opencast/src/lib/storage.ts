import { LocalStorage } from "@raycast/api";
import type {
  ModelOption,
  OpencodeTarget,
  RecentSession,
  RecentTarget,
} from "./types";
import { targetKey } from "./targets";

const RECENT_TARGETS_KEY = "recent-targets";
const RECENT_SESSIONS_KEY = "recent-sessions";
const LAST_TARGET_KEY = "last-target";
const SELECTED_MODELS_KEY = "selected-models";
const RECENT_MODELS_KEY = "recent-models";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function getRecentTargets(): Promise<RecentTarget[]> {
  return readJson<RecentTarget[]>(RECENT_TARGETS_KEY, []);
}

export async function saveRecentTarget(target: OpencodeTarget): Promise<void> {
  const existing = await getRecentTargets();
  const next: RecentTarget = {
    ...target,
    label: target.workspace
      ? `${target.directory} (${target.workspace})`
      : target.directory,
    lastUsedAt: Date.now(),
  };
  const filtered = existing.filter(
    (item) => targetKey(item) !== targetKey(target),
  );
  filtered.unshift(next);
  await writeJson(RECENT_TARGETS_KEY, filtered.slice(0, 12));
  await writeJson(LAST_TARGET_KEY, target);
}

export async function getLastTarget(): Promise<OpencodeTarget | undefined> {
  return readJson<OpencodeTarget | undefined>(LAST_TARGET_KEY, undefined);
}

export async function saveRecentSession(
  session: { id: string; title: string },
  target: OpencodeTarget,
): Promise<void> {
  const existing = await readJson<RecentSession[]>(RECENT_SESSIONS_KEY, []);
  const next: RecentSession = {
    ...session,
    targetKey: targetKey(target),
    lastOpenedAt: Date.now(),
  };
  const filtered = existing.filter(
    (item) => item.id !== session.id || item.targetKey !== next.targetKey,
  );
  filtered.unshift(next);
  await writeJson(RECENT_SESSIONS_KEY, filtered.slice(0, 30));
}

export async function getRecentSessions(
  target?: OpencodeTarget,
): Promise<RecentSession[]> {
  const sessions = await readJson<RecentSession[]>(RECENT_SESSIONS_KEY, []);
  if (!target) {
    return sessions;
  }
  return sessions.filter((item) => item.targetKey === targetKey(target));
}

function trimModel(model: ModelOption): ModelOption {
  return {
    providerID: model.providerID,
    modelID: model.modelID,
    title: model.title,
    providerTitle: model.providerTitle,
    subtitle: model.subtitle,
    isDefault: model.isDefault,
    isConnected: model.isConnected,
  };
}

export function modelSelectionStorageKey(target: OpencodeTarget): string {
  return targetKey(target);
}

export async function getSelectedModel(
  target: OpencodeTarget,
): Promise<ModelOption | undefined> {
  const selected = await readJson<Record<string, ModelOption>>(
    SELECTED_MODELS_KEY,
    {},
  );
  return selected[modelSelectionStorageKey(target)];
}

export async function saveSelectedModel(
  target: OpencodeTarget,
  model: ModelOption,
): Promise<void> {
  const selected = await readJson<Record<string, ModelOption>>(
    SELECTED_MODELS_KEY,
    {},
  );
  selected[modelSelectionStorageKey(target)] = trimModel(model);
  await writeJson(SELECTED_MODELS_KEY, selected);

  const recent = await readJson<Record<string, ModelOption[]>>(
    RECENT_MODELS_KEY,
    {},
  );
  const key = modelSelectionStorageKey(target);
  const next = [
    trimModel(model),
    ...(recent[key] ?? []).filter(
      (item) =>
        item.providerID !== model.providerID || item.modelID !== model.modelID,
    ),
  ];
  recent[key] = next.slice(0, 8);
  await writeJson(RECENT_MODELS_KEY, recent);
}

export async function getRecentModels(
  target: OpencodeTarget,
): Promise<ModelOption[]> {
  const recent = await readJson<Record<string, ModelOption[]>>(
    RECENT_MODELS_KEY,
    {},
  );
  return recent[modelSelectionStorageKey(target)] ?? [];
}
