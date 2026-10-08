import { LocalStorage, Toast, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";

const BLUEPRINTS_KEY = "arc-blueprints";
// Mirror of the LocalStorage data in Raycast's cache, so every open view (list rows, pushed details) updates at once.
const STORE_CACHE_KEY = "arc-blueprints-store";

export interface BlueprintStatus {
  obtained: boolean;
  duplicates: number;
}

export type BlueprintStore = Record<string, BlueprintStatus>;

type StatusChange = (status: BlueprintStatus | undefined) => BlueprintStatus;

const NOT_OBTAINED: BlueprintStatus = { obtained: false, duplicates: 0 };

export async function getBlueprintStore(): Promise<BlueprintStore> {
  const data = await LocalStorage.getItem<string>(BLUEPRINTS_KEY);
  if (!data) return {};
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Writes are chained so rapid toggles cannot interleave their read-modify-write cycles.
let pendingWrite: Promise<unknown> = Promise.resolve();

function saveStatus(id: string, change: StatusChange): Promise<BlueprintStore> {
  const write = pendingWrite.then(async () => {
    const store = await getBlueprintStore();
    store[id] = change(store[id]);
    await LocalStorage.setItem(BLUEPRINTS_KEY, JSON.stringify(store));
    return store;
  });
  pendingWrite = write.catch(() => undefined);
  return write;
}

function toggled(status: BlueprintStatus = NOT_OBTAINED): BlueprintStatus {
  return { ...status, obtained: !status.obtained };
}

function withDuplicates(delta: number): StatusChange {
  // Owning a duplicate implies the blueprint itself is obtained.
  return (status = NOT_OBTAINED) => ({ obtained: true, duplicates: Math.max(0, status.duplicates + delta) });
}

export type BlueprintTracker = ReturnType<typeof useBlueprintStore>;

export function useBlueprintStore() {
  const [store, setStore] = useCachedState<BlueprintStore>(STORE_CACHE_KEY, {});
  const [isLoading, setIsLoading] = useState(true);

  // LocalStorage is the source of truth; refresh the mirror once any in-flight write has finished.
  useEffect(() => {
    let cancelled = false;
    pendingWrite.then(getBlueprintStore).then((saved) => {
      if (cancelled) return;
      setStore(saved);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [setStore]);

  const update = useCallback(
    async (id: string, change: StatusChange): Promise<BlueprintStatus> => {
      setStore((current) => ({ ...current, [id]: change(current[id]) }));
      try {
        const saved = await saveStatus(id, change);
        setStore(saved);
        return saved[id];
      } catch (error) {
        setStore(await getBlueprintStore());
        throw error;
      }
    },
    [setStore],
  );

  const toggleObtained = useCallback(
    async (id: string, name: string) => {
      try {
        const status = await update(id, toggled);
        await showToast({
          style: Toast.Style.Success,
          title: status.obtained ? "Marked as Obtained" : "Marked as Needed",
          message: name,
        });
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to update blueprint", message: String(error) });
      }
    },
    [update],
  );

  const adjustDuplicates = useCallback(
    async (id: string, name: string, delta: number) => {
      try {
        const status = await update(id, withDuplicates(delta));
        await showToast({
          style: Toast.Style.Success,
          title: delta > 0 ? "Added Duplicate" : "Removed Duplicate",
          message: `${name} (${status.duplicates} total)`,
        });
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to update blueprint", message: String(error) });
      }
    },
    [update],
  );

  return {
    store,
    isLoading,
    status: (id: string): BlueprintStatus | undefined => store[id],
    isObtained: (id: string) => !!store[id]?.obtained,
    toggleObtained,
    adjustDuplicates,
  };
}
