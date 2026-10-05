import { LocalStorage } from "@raycast/api";
import { StoredEnvironment } from "./types";

const STORAGE_KEY = "kafka-ui-environments";

export async function getEnvironments(): Promise<StoredEnvironment[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as StoredEnvironment[];
  } catch {
    console.error("[kafka-ui] Failed to parse environments from storage, resetting:", raw);
    return [];
  }
}

export async function saveEnvironments(envs: StoredEnvironment[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(envs));
}

export async function addEnvironment(env: StoredEnvironment): Promise<void> {
  const envs = await getEnvironments();
  envs.push(env);
  await saveEnvironments(envs);
}

export async function updateEnvironment(updated: StoredEnvironment): Promise<void> {
  const envs = await getEnvironments();
  const index = envs.findIndex((e) => e.id === updated.id);
  if (index >= 0) {
    envs[index] = updated;
    await saveEnvironments(envs);
  }
}

export async function deleteEnvironment(id: string): Promise<void> {
  const envs = await getEnvironments();
  await saveEnvironments(envs.filter((e) => e.id !== id));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
