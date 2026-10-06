import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { initialStore, type Store } from "./types";

const KEY = "tally.store.v1";
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
        const raw = await LocalStorage.getItem<string>(KEY);
        const stored: Store = raw ? JSON.parse(raw) : initialStore();
        if (
          stored.version !== 1 ||
          !Array.isArray(stored.entries) ||
          !Array.isArray(stored.templates) ||
          !stored.templates.some((template) => template.id === stored.selectedTemplateId)
        ) {
          throw new Error("Saved data is invalid. It has not been overwritten.");
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
      const next = update(current.current);
      await LocalStorage.setItem(KEY, JSON.stringify(next));
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
