import { randomUUID } from "node:crypto";
import { LocalStorage } from "@raycast/api";

export interface Transition {
  /** Identifies the command that started this transition. */
  id: string;
  kind: "connect" | "disconnect";
  countryCode?: string;
  startedAt: number;
}

const KEY = "transition";
const STALE_MS = 150000;

/** Record a new transition and return its id. */
export async function setTransition(
  transition: Omit<Transition, "startedAt" | "id">,
): Promise<string> {
  const id = randomUUID();
  await LocalStorage.setItem(
    KEY,
    JSON.stringify({ ...transition, id, startedAt: Date.now() }),
  );
  return id;
}

/**
 * Remove the stored transition. With an `id`, remove it only when it is still
 * the one that id started, so a command never clears the record of another
 * command that is still running.
 */
export async function clearTransition(id?: string): Promise<void> {
  if (id) {
    const active = await getTransition();
    if (active && active.id !== id) return;
  }
  await LocalStorage.removeItem(KEY);
}

export async function getTransition(): Promise<Transition | undefined> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return undefined;
  try {
    const transition = JSON.parse(raw) as Transition;
    if (Date.now() - transition.startedAt > STALE_MS) {
      await LocalStorage.removeItem(KEY);
      return undefined;
    }
    return transition;
  } catch {
    await LocalStorage.removeItem(KEY);
    return undefined;
  }
}
