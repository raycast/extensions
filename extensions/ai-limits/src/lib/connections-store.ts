import { LocalStorage } from "@raycast/api";
import {
  Connections,
  mergeConnections,
  parseConnections,
  serializeConnections,
  withoutConnections,
} from "./connections";

// One key holds every connection. The "-v1" suffix leaves room for a later format without breaking what is stored now.
const STORAGE_KEY = "connections-v1";

// Every read and write waits for the one before it. A save reads the stored value, merges into it and writes it back, so
// two saves started at the same time would otherwise each drop the other's fields.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  // A failed task must not stop the ones queued after it, so the queue carries on from its outcome either way.
  queue = result.catch(() => undefined);
  return result;
}

async function readStored(): Promise<Connections> {
  return parseConnections(await LocalStorage.getItem<string>(STORAGE_KEY));
}

async function writeStored(connections: Connections): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, serializeConnections(connections));
}

export function loadConnections(): Promise<Connections> {
  return enqueue(readStored);
}

// Merges `patch` into the stored connections and returns the result. See mergeConnections for how empty values behave.
export function saveConnections(patch: Partial<Connections>): Promise<Connections> {
  return enqueue(async () => {
    const next = mergeConnections(await readStored(), patch);
    await writeStored(next);
    return next;
  });
}

// Removes the given connections, such as when the user signs out, and returns what is left.
export function forgetConnections(keys: (keyof Connections)[]): Promise<Connections> {
  return enqueue(async () => {
    const next = withoutConnections(await readStored(), keys);
    await writeStored(next);
    return next;
  });
}
