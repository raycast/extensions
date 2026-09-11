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
  // A pinned command follows its own selection, so an action fired right after
  // selecting targets the new Session rather than the pinned one.
  if (pinnedSession !== undefined) pinnedSession = name;
}

/** Deleting the Selected Session clears the selection; stopping it does not. */
export async function clearSelectedSessionIf(name: string): Promise<void> {
  if ((await getSelectedSession()) === name) await LocalStorage.removeItem(SELECTED_SESSION_KEY);
}

/** The Preferred Session: the "Default Session" preference, or Herdr's own default. */
export function getPreferredSession(): string {
  return getHerdrPreferences().sessionName?.trim() || DEFAULT_SESSION;
}

let pinnedSession: string | undefined;

/**
 * Pins the Session a view targets for as long as it is on screen, and returns
 * the release. A view resolves the Session once and shows one Session's
 * Snapshot, while every action re-resolves independently; without the pin, a
 * selection made in another command retargets those actions at a Session the
 * user is not looking at. Pane and Tab ids are Session-scoped and collide
 * across Sessions, so an action would land on a real but wrong resource.
 */
export function pinSession(name: string): () => void {
  pinnedSession = name;
  return () => {
    if (pinnedSession === name) pinnedSession = undefined;
  };
}

/** Drops any pin. For tests and for a command that stops showing one Session. */
export function releaseSessionPin(): void {
  pinnedSession = undefined;
}

/**
 * The Session a CLI call or terminal launch targets. An explicit session wins,
 * and an empty one still means "no --session flag"; then the Session pinned by
 * the view on screen, the Selected Session, the Preferred Session, and Herdr's
 * default. Every caller resolves here so a future follow-terminal-focus layer
 * has one place to slot in above the stored selection.
 */
export async function resolveSession(explicit?: string): Promise<string> {
  if (explicit !== undefined) return explicit;
  return pinnedSession ?? (await resolveStoredSession());
}

/**
 * The Selected Session as persisted, or the Preferred Session, ignoring any pin.
 * A view refreshes through this so it can discover a selection made in another
 * command; the pin exists for the actions that view fires, not for its reads.
 */
export async function resolveStoredSession(): Promise<string> {
  return (await getSelectedSession()) ?? getPreferredSession();
}
