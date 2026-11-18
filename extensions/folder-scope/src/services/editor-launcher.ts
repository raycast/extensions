import { getApplications, open } from "@raycast/api";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import type { EditorType } from "../types/preferences";
import { EDITOR_BUNDLE_IDS, EDITOR_TITLES, editorLaunch, type EditorPosition } from "../utils/editor-open";

/**
 * Opens the preferred editor at the matched line. Throws an `Error` with a
 * user-facing message when the file is gone, the editor is not installed, or
 * its command-line launcher is missing — the caller turns that into a toast.
 */
export async function openInEditor(editor: EditorType, target: EditorPosition): Promise<void> {
  try {
    await access(target.filePath, constants.R_OK);
  } catch {
    throw new Error(`${target.filePath} no longer exists or is not readable. Refresh the search.`);
  }

  const wanted = new Set(EDITOR_BUNDLE_IDS[editor]);
  const app = (await getApplications()).find(
    (candidate) => candidate.bundleId !== undefined && wanted.has(candidate.bundleId),
  );
  if (app === undefined) {
    throw new Error(`${EDITOR_TITLES[editor]} is not installed. Pick another editor in the extension preferences.`);
  }

  const launch = editorLaunch(editor, target);
  if (launch.kind === "url") {
    await open(launch.url, app.bundleId);
    return;
  }

  const executable = join(app.path, launch.relativeExecutable);
  try {
    await access(executable, constants.X_OK);
  } catch {
    throw new Error(`${EDITOR_TITLES[editor]} launcher was not found at ${executable}.`);
  }
  // Fire and forget: the launcher may stay alive as the IDE itself, so never
  // wait for it to exit.
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, launch.args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
