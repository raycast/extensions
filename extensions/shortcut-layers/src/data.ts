import { LocalStorage, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { normalizeLayer } from "./schema";
import { STORAGE_KEY } from "./types";
import type { Layer } from "./types";

const CORRUPT_KEY = `${STORAGE_KEY}.corrupt`;

export async function loadLayers(): Promise<Layer[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeLayer) : [];
  } catch {
    await LocalStorage.setItem(CORRUPT_KEY, raw);
    showToast({
      style: Toast.Style.Failure,
      title: "Stored layers were unreadable",
      message: "Raw payload backed up under the layers.corrupt key",
    });
    return [];
  }
}

export async function saveLayers(layers: Layer[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(layers.map(normalizeLayer)));
}

export function useLayers() {
  const { isLoading, data, revalidate } = usePromise(loadLayers);
  return { isLoading, layers: data ?? [], revalidate };
}
