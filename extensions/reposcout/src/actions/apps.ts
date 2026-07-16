import type { EditorId } from "../preferences/types";

/**
 * Pure label helpers for editors. The mapping from an editor id to the actual
 * installed macOS application is handled by `editor.ts` (which resolves the real
 * app via `getApplications()`); this module only provides display labels.
 */

/** Human-facing label for each supported editor. */
const EDITOR_LABELS: Record<EditorId, string> = {
  vscode: "VS Code",
  cursor: "Cursor",
};

/** A short human label for an editor id (for action titles). */
export function editorLabel(editor: EditorId): string {
  return EDITOR_LABELS[editor];
}

/** The editor that is NOT the primary one, for the secondary open action. */
export function otherEditor(editor: EditorId): EditorId {
  return editor === "vscode" ? "cursor" : "vscode";
}
