import { canonical } from "./model.ts";
import { lstat } from "node:fs/promises";
import type { LibraryState } from "./model.ts";
import { configureDirectory, readLibrary } from "./repository.ts";
import { connectSharedJson, refreshSharedJson } from "./shared-json-sync.ts";
import {
  disconnectSharedSource,
  hasSharedSourceChoice,
} from "./shared-json-storage.ts";

export async function loadConfiguredLibrary(
  preferences: { dataFile?: string; dataDirectory?: string },
  supportPath: string,
) {
  const root = await configureDirectory(preferences.dataDirectory, supportPath);
  let state = await readLibrary(root);
  let sourceError: string | undefined;
  try {
    if (state.status === "ready") {
      const selectedFile = preferences.dataFile?.trim();
      if (selectedFile && !(await hasSharedSourceChoice())) {
        // Choosing a folder in extension preferences makes it the active source.
        // The source is read without being rewritten; existing event history stays intact.
        if ((await lstat(selectedFile)).isFile()) {
          await disconnectSharedSource();
        } else {
          state = (await connectSharedJson(root, selectedFile, state)).state;
        }
      } else {
        state = await refreshSharedJson(root, state);
      }
    }
  } catch (error) {
    sourceError = error instanceof Error ? error.message : String(error);
    state = await readLibrary(root);
  }
  return { root, state, sourceError };
}

function revision(state: LibraryState) {
  return canonical({
    status: state.status,
    heads: state.heads,
    visits: state.visitEventIds,
    issues: state.issues,
  });
}

export async function refreshVisibleLibrary(
  root: string,
  previous: LibraryState,
) {
  let next = await readLibrary(root);
  if (next.status === "ready") next = await refreshSharedJson(root, next);
  return revision(next) === revision(previous) ? previous : next;
}
