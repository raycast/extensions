import { LocalStorage } from "@raycast/api";
import type { ApiConfig } from "./types";

const BLOB_KEY = "api-cfg-blob";

interface Blob {
  version: number;
  configs: ApiConfig[];
}

async function readBlob(): Promise<Blob> {
  const raw = await LocalStorage.getItem<string>(BLOB_KEY);
  if (!raw) return { version: 0, configs: [] };
  return JSON.parse(raw) as Blob;
}

export async function getConfigs(): Promise<{ configs: ApiConfig[]; version: number }> {
  const blob = await readBlob();
  return { configs: blob.configs, version: blob.version };
}

export async function saveConfig(config: ApiConfig, expectedVersion: number, isEdit?: boolean): Promise<void> {
  const blob = await readBlob();
  if (isEdit && blob.version !== expectedVersion) {
    throw new Error("Config was modified by another window. Please reload and try again.");
  }
  const idx = blob.configs.findIndex((c) => c.id === config.id);
  if (idx >= 0) {
    blob.configs[idx] = config;
  } else {
    blob.configs.push(config);
  }
  blob.version++;
  await LocalStorage.setItem(BLOB_KEY, JSON.stringify(blob));
}

export async function deleteConfig(id: string): Promise<void> {
  const blob = await readBlob();
  blob.configs = blob.configs.filter((c) => c.id !== id);
  blob.version++;
  await LocalStorage.setItem(BLOB_KEY, JSON.stringify(blob));
}
