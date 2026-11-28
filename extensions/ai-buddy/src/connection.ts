import { LocalStorage } from "@raycast/api";
import type { ProviderId } from "./providers";

/**
 * The AI connection, set in AI Buddy → AI Setup (not Raycast Settings, which can't check a key
 * while you type or show the API Host only for Custom). Kept in Raycast's LocalStorage, which
 * Raycast stores in its encrypted local database. Each provider keeps its own key, so switching
 * back and forth doesn't ask for it again.
 */
export type Connection = {
  provider: ProviderId;
  /** API Host, for Custom only. */
  host: string;
  keys: Partial<Record<ProviderId, string>>;
};

const STORAGE_KEY = "connection";
let current: Connection | undefined;

/** Reads the saved connection once per command run; the rest of the code reads it synchronously. */
export async function loadConnection(): Promise<Connection | undefined> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  current = parse(raw);
  return current;
}

function parse(raw: string | undefined): Connection | undefined {
  if (!raw) return undefined;
  try {
    const data = JSON.parse(raw);
    if (typeof data?.provider !== "string") return undefined;
    return { provider: data.provider, host: typeof data.host === "string" ? data.host : "", keys: data.keys ?? {} };
  } catch {
    return undefined;
  }
}

/** The loaded connection (undefined until AI Setup has been saved once). */
export const connection = (): Connection | undefined => current;

/** Uses this connection from now on in this run (AI Setup after saving; tests). */
export function setCurrentConnection(next: Connection | undefined) {
  current = next;
}

export async function saveConnection(next: Connection) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  current = next;
}
