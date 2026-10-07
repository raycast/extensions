import { Cache, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { initialStore, type Store } from "./types";

const KEY = "tallies.store.v1";
const SELECTED_TEMPLATE_KEY = "tallies.selectedTemplateId";
// Explicitly namespace this cache so Template and Check In share one value
// even when Raycast runs their entry points in separate processes.
const selectionCache = new Cache({ namespace: "tallies-shared" });
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
        const raw = (await LocalStorage.getItem<string>(KEY)) ?? (await LocalStorage.getItem<string>("tally.store.v1"));
        const stored: Store = raw ? JSON.parse(raw) : initialStore();
        if (
          stored.version !== 1 ||
          !Array.isArray(stored.entries) ||
          !Array.isArray(stored.templates) ||
          !stored.templates.some((template) => template.id === stored.selectedTemplateId)
        ) {
          throw new Error("Saved data is invalid. It has not been overwritten.");
        }
        const rememberedTemplateId =
          selectionCache.get(SELECTED_TEMPLATE_KEY) ??
          (await LocalStorage.getItem<string>(SELECTED_TEMPLATE_KEY)) ??
          (await LocalStorage.getItem<string>("tally.selectedTemplateId"));
        if (rememberedTemplateId && stored.templates.some((template) => template.id === rememberedTemplateId)) {
          stored.selectedTemplateId = rememberedTemplateId;
        }
        if (!raw) await LocalStorage.setItem(KEY, JSON.stringify(stored));
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
      // Commands can stay mounted at the same time. Read the latest document
      // before applying an update so one view cannot overwrite another view's
      // edits with its older snapshot.
      const raw = await LocalStorage.getItem<string>(KEY);
      const latest = raw ? (JSON.parse(raw) as Store) : current.current;
      const next = update(latest);
      await LocalStorage.setItem(KEY, JSON.stringify(next));
      await LocalStorage.setItem(SELECTED_TEMPLATE_KEY, next.selectedTemplateId);
      selectionCache.set(SELECTED_TEMPLATE_KEY, next.selectedTemplateId);
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
