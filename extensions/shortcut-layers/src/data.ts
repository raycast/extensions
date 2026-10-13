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

/**
 * Applies `change` to a stored layer and saves it in one read-modify-write.
 * Returns false when the layer no longer exists.
 */
export async function updateLayer(layerId: string, change: (layer: Layer) => void): Promise<boolean> {
  const layers = await loadLayers();
  const layer = layers.find((l) => l.id === layerId);
  if (!layer) return false;
  change(layer);
  await saveLayers(layers);
  return true;
}
