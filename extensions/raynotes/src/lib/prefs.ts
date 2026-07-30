import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";
import { ensureDir, expandTilde } from "./notes";

/** Resolves the notes folder and creates it if this is the first run. */
export function notesRoot(): string {
  const { notesDirectory } = getPreferenceValues<Preferences>();
  const root = expandTilde(notesDirectory?.trim() || join(homedir(), "notes"));
  ensureDir(root);
  return root;
}
