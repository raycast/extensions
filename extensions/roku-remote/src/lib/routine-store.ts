import { validateRoutine, type Routine } from "./routines";

export interface RoutineStorage {
  allItems(): Promise<Record<string, unknown>>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const PREFIX = "roku-direct.routine.v1.";

function recordKey(id: string): string {
  if (typeof id !== "string" || !id.trim() || id.trim().length > 128) throw new Error("Invalid routine ID.");
  return PREFIX + Buffer.from(id.trim(), "utf8").toString("base64url");
}

/** Separate records avoid an index rewrite losing simultaneous changes to other routines. */
export function createRoutineStore(storage: RoutineStorage) {
  let pending: Promise<unknown> = Promise.resolve();
  function mutate(operation: () => Promise<void>): Promise<void> {
    const work = pending.catch(() => undefined).then(operation);
    pending = work;
    return work;
  }

  async function getRoutines(): Promise<Routine[]> {
    const records = await storage.allItems();
    const routines: Routine[] = [];
    for (const [key, raw] of Object.entries(records)) {
      if (!key.startsWith(PREFIX) || typeof raw !== "string") continue;
      try {
        const record = JSON.parse(raw);
        if (record?.version !== 1) continue;
        const routine = validateRoutine(record.routine);
        if (key !== recordKey(routine.id)) continue;
        routines.push(routine);
      } catch {
        /* An unreadable routine must not hide other routines or prevent a new save. */
      }
    }
    return routines.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }

  async function saveRoutine(value: Routine): Promise<void> {
    const routine = validateRoutine(value);
    return mutate(() => storage.setItem(recordKey(routine.id), JSON.stringify({ version: 1, routine })));
  }

  async function removeRoutine(id: string): Promise<void> {
    const key = recordKey(id);
    return mutate(() => storage.removeItem(key));
  }

  return { getRoutines, saveRoutine, removeRoutine };
}

// Loading the pure factory in tests must not import Raycast's native runtime.
let defaultStore: Promise<ReturnType<typeof createRoutineStore>> | undefined;
function localStore() {
  return (defaultStore ??= import("@raycast/api").then(({ LocalStorage }) => createRoutineStore(LocalStorage)));
}

export async function getRoutines(): Promise<Routine[]> {
  return (await localStore()).getRoutines();
}

export async function saveRoutine(routine: Routine): Promise<void> {
  return (await localStore()).saveRoutine(routine);
}

export async function removeRoutine(id: string): Promise<void> {
  return (await localStore()).removeRoutine(id);
}
