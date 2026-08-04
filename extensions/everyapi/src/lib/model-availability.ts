import { LocalStorage } from "@raycast/api";
import type { ModelInfo } from "./api";
import {
  filterAvailableModels,
  type ModelRejections,
} from "./model-availability-core";

const STORAGE_KEY = "everyapi.unavailableModels.v1";

export async function readModelRejections(): Promise<ModelRejections> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([model, timestamp]) =>
          model.length > 0 && typeof timestamp === "number" && timestamp > 0,
      ),
    );
  } catch {
    return {};
  }
}

export async function markModelUnavailable(model: string): Promise<void> {
  const rejections = await readModelRejections();
  rejections[model] = Date.now();
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(rejections));
}

export async function availableModels<T extends Pick<ModelInfo, "id">>(
  models: T[],
): Promise<T[]> {
  return filterAvailableModels(models, await readModelRejections());
}
