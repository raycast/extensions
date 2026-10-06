import { Cache, environment, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { join } from "node:path";
import type { Store } from "./types";
import { createStorePersistence, SELECTED_TEMPLATE_KEY } from "./store-persistence";

// Explicitly namespace this cache so Template and Check In share one value
// even when Raycast runs their entry points in separate processes.
const selectionCache = new Cache({ namespace: "tallies-shared" });
const persistence = createStorePersistence(LocalStorage, join(environment.supportPath, "store-write"), (store) => {
  selectionCache.set(SELECTED_TEMPLATE_KEY, store.selectedTemplateId);
});
export const readStore = persistence.read;

export function rememberSelectedTemplate(id: string) {
  selectionCache.set(SELECTED_TEMPLATE_KEY, id);
}
export async function reportError(title: string, error: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
export function useStore() {
  const [data, setData] = useState<Store>();
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const busy = useRef(false);
  const current = useRef<Store | undefined>(undefined);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await readStore();
        const rememberedTemplateId =
          selectionCache.get(SELECTED_TEMPLATE_KEY) ?? (await LocalStorage.getItem<string>(SELECTED_TEMPLATE_KEY));
        if (rememberedTemplateId && stored.templates.some((template) => template.id === rememberedTemplateId)) {
          stored.selectedTemplateId = rememberedTemplateId;
        }
        if (active) {
          current.current = stored;
          setData(stored);
        }
      } catch (error) {
        await reportError("Could Not Load Attendance", error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const save = useCallback(async (update: (store: Store) => Store, title: string): Promise<boolean> => {
    if (!current.current || busy.current) {
      await reportError("Could Not Save", "Wait for the current operation to finish.");
      return false;
    }
    busy.current = true;
    setSaving(true);
    try {
      const next = await persistence.update(update);
      current.current = next;
      setData(next);
      await showToast({ style: Toast.Style.Success, title });
      return true;
    } catch (error) {
      await reportError("Could Not Save", error);
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, []);
  return { data, isLoading, isSaving, save };
}
export type SaveStore = ReturnType<typeof useStore>["save"];
