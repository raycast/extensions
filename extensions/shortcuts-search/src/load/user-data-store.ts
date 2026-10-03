import type { UserDataState } from "../user-data/service";
export interface PrivateSnapshot {
  data: UserDataState | null;
  isLoading: boolean;
  error?: string;
  initialized: boolean;
}
export function createUserDataStore(dependencies: {
  getToken(allow: boolean): Promise<string | null>;
  isCurrent(token: string): Promise<boolean>;
  load(token: string): Promise<UserDataState>;
}) {
  let snapshot: PrivateSnapshot = { data: null, isLoading: false, initialized: false };
  let snapshotToken: string | null = null;
  let generation = 0;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const update = (next: PrivateSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const reset = () => {
    snapshotToken = null;
    generation++;
    pending = null;
    update({ data: null, isLoading: false, initialized: false });
  };
  const revalidate = (allow = false): Promise<void> => {
    if (pending) return pending;
    const version = ++generation;
    update({ ...snapshot, isLoading: true, error: undefined });
    const operation = (async () => {
      try {
        const token = await dependencies.getToken(allow);
        if (generation !== version) return;
        if (!token) {
          snapshotToken = null;
          update({ data: null, isLoading: false, initialized: true });
          return;
        }
        if (snapshotToken !== token) {
          snapshotToken = token;
          update({ data: null, isLoading: true, initialized: false });
        }
        const data = await dependencies.load(token);
        if (generation !== version) return;
        const isCurrent = await dependencies.isCurrent(token);
        if (generation !== version) return;
        if (!isCurrent) {
          reset();
          return;
        }
        if (generation === version) update({ data, isLoading: false, initialized: true });
      } catch (error) {
        if (generation === version)
          update({
            data: null,
            isLoading: false,
            initialized: true,
            error: error instanceof Error ? error.message : "Private data could not sync",
          });
      }
    })().finally(() => {
      if (pending === operation) pending = null;
    });
    pending = operation;
    return operation;
  };
  return {
    getSnapshot: () => snapshot,
    reset,
    revalidate,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) reset();
      };
    },
  };
}
