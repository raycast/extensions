import { storageGet, storageRemove, storageSet } from "./storage";

export type Session = { token: string; userId: string; email: string };

const KEY = "session";

export async function getSession(): Promise<Session | null> {
  return (await storageGet<Session>(KEY)) ?? null;
}

export async function setSession(session: Session): Promise<void> {
  await storageSet(KEY, session);
}

export async function clearSession(): Promise<void> {
  await storageRemove(KEY);
}
