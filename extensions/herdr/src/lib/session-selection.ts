import { LocalStorage } from "@raycast/api";
import { getHerdrPreferences } from "./preferences";

const SELECTED_SESSION_KEY = "selectedSession";
export const DEFAULT_SESSION = "default";

/** The Selected Session: the one the user picked in Manage Sessions, shared by every command. */
export async function getSelectedSession(): Promise<string | undefined> {
  const stored = await LocalStorage.getItem<string>(SELECTED_SESSION_KEY);
  const name = typeof stored === "string" ? stored.trim() : "";
  return name || undefined;
}

export async function setSelectedSession(name: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_SESSION_KEY, name);
}

/** Deleting the Selected Session clears the selection; stopping it does not. */
export async function clearSelectedSessionIf(name: string): Promise<void> {
  if ((await getSelectedSession()) === name) await LocalStorage.removeItem(SELECTED_SESSION_KEY);
}

/** The Preferred Session: the "Default Session" preference, or Herdr's own default. */
export function getPreferredSession(): string {
  return getHerdrPreferences().sessionName?.trim() || DEFAULT_SESSION;
}

/**
 * The Session a CLI call or terminal launch targets. An explicit session wins,
 * and an empty one still means "no --session flag"; then the Selected Session,
 * the Preferred Session, and Herdr's default. Every caller resolves here so a
 * future follow-terminal-focus layer has one place to slot in above the
 * stored selection.
 */
export async function resolveSession(explicit?: string): Promise<string> {
  if (explicit !== undefined) return explicit;
  return (await getSelectedSession()) ?? getPreferredSession();
}
