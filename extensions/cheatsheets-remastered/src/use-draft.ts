import { useEffect, useMemo, useRef, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DraftSession } from "./drafts";
import { withStorageLock } from "./library-store";

export function useDraftPersistence<T extends string | boolean>(key: string, defaultValue: T) {
  const [isReady, setReady] = useState(false);
  const [value, setValue] = useState<T>(defaultValue);
  const edited = useRef(false);
  const session = useMemo(
    () => new DraftSession(LocalStorage, withStorageLock, key, defaultValue),
    [key, defaultValue],
  );
  const ready = useRef<Promise<T>>(null);
  const report = (error: unknown) =>
    showFailureToast(error, {
      title: "Draft Not Saved",
      message: error instanceof Error ? error.message : "Storage unavailable. Copy your draft before closing.",
    });
  useEffect(() => {
    let mounted = true;
    edited.current = false;
    setReady(false);
    ready.current = session.load();
    ready.current
      .then((stored) => {
        if (mounted) {
          if (!edited.current) setValue(stored);
          setReady(true);
        }
      })
      .catch(report);
    return () => {
      mounted = false;
    };
  }, [session]);
  const updateValue = (next: T) => {
    edited.current = true;
    setValue(next);
    // Loading must complete before writes; a late read must not replace typed text.
    void ready.current?.then(() => session.save(next)).catch(report);
  };
  const clearDraft = async () => {
    try {
      await ready.current;
      await session.save();
      edited.current = true;
      setValue(defaultValue);
      return true;
    } catch (error) {
      await report(error);
      return false;
    }
  };
  return { value, updateValue, clearDraft, isReady };
}
