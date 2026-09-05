/**
 * Workspace focus — an EXPLICIT, VISIBLE, sticky lens for Raycast.
 *
 * Raycast deliberately never *silently* scopes a request (that is what causes
 * fail-open-empty-lens duplicates). Focus keeps that guarantee: it is only ever
 * set by an explicit user action ("Set Synap Focus"), it is always surfaced
 * (menu-bar indicator, command subtitles, and echoed in `orient`), and it can be
 * cleared at any time. When set, human command surfaces default their workspace
 * to it and the AI is TOLD the current focus (never scoped behind its back).
 *
 * Stored in LocalStorage (per-machine, like the OAuth connection), NOT in the
 * shared CLI config — a Raycast focus is a local navigation preference.
 */

import { LocalStorage } from "@raycast/api";

const FOCUS_KEY = "synap.focus.workspace";

export interface WorkspaceFocus {
  workspaceId: string;
  /** Human label shown in the indicator; resolved when the focus was set. */
  name: string;
}

/** The current focus, or null when the caller is pod-wide. */
export async function getFocus(): Promise<WorkspaceFocus | null> {
  const raw = await LocalStorage.getItem<string>(FOCUS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceFocus>;
    if (typeof parsed.workspaceId === "string" && typeof parsed.name === "string") {
      return { workspaceId: parsed.workspaceId, name: parsed.name };
    }
  } catch {
    // Corrupt value — treat as no focus rather than throwing in a render path.
  }
  return null;
}

/** Pin the focus to a resolved workspace. Explicit user action only. */
export async function setFocus(focus: WorkspaceFocus): Promise<void> {
  await LocalStorage.setItem(FOCUS_KEY, JSON.stringify(focus));
}

/** Clear the focus — the caller returns to pod-wide. */
export async function clearFocus(): Promise<void> {
  await LocalStorage.removeItem(FOCUS_KEY);
}
