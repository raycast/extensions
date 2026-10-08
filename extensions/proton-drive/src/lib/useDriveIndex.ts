import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { showError } from "./errors";
import { handleSignedOut, isSignedOut, onSignedOut } from "./session";
import { buildIndex, DriveIndex, IndexAbortedError, IndexBusyError, isIndexing, readIndex } from "./index";

/**
 * Index state shared by every folder view of the command: building or refreshing the index from a
 * nested folder updates the views further back in the navigation stack too.
 */
interface IndexState {
  index?: DriveIndex;
  /** Progress of a build, by this command or by another one (e.g. the background refresh). */
  progress?: string;
}

const BACKGROUND = "Indexing in the background…";

let state: IndexState = {};
const listeners = new Set<(state: IndexState) => void>();

function update(patch: Partial<IndexState> | ((current: IndexState) => Partial<IndexState>)) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  listeners.forEach((listener) => listener(state));
}

/** True while this command runs a build. */
let building = false;
/** Polls the index file while another command builds it, to show its checkpoints. */
let following: ReturnType<typeof setInterval> | undefined;

function stopFollowing() {
  clearInterval(following);
  following = undefined;
}

function follow() {
  update({ progress: BACKGROUND });
  if (following) return;
  following = setInterval(async () => {
    // A build started here in the meantime owns the state now; don't overwrite it with a checkpoint.
    if (building) return;
    const stillIndexing = await isIndexing();
    const latest = await readIndex();
    if (latest) update({ index: latest });
    if (!stillIndexing) {
      stopFollowing();
      update({ progress: undefined });
    }
  }, 10_000);
}

// Once signed out, the previous session's index must not stay in memory either.
onSignedOut(() => {
  stopFollowing();
  update({ index: undefined, progress: undefined });
});

/** Builds or refreshes the index. `silent` skips the progress toast (automatic resume). */
export async function refreshIndex(silent: boolean): Promise<void> {
  if (building) return;
  if (await isIndexing()) return follow();
  // A background build may have just finished: stop following it before starting ours.
  stopFollowing();
  building = true;
  const toast = silent ? undefined : await showToast({ style: Toast.Style.Animated, title: "Indexing Proton Drive…" });
  try {
    let shown = 0;
    const fresh = await buildIndex((done, left, partial) => {
      const text = `${done} folders listed · ${left} to go · ${partial.entries.length} items`;
      update({ progress: text });
      if (toast) toast.message = text;
      // During the very first crawl, make results searchable as they come in.
      if (partial.entries.length - shown > 500) {
        shown = partial.entries.length;
        update((current) =>
          !current.index || current.index.partial
            ? // Copies: the crawl keeps appending to these arrays.
              { index: { ...partial, folders: partial.folders.slice(), entries: partial.entries.slice() } }
            : {},
        );
      }
    });
    update({ index: fresh });
    if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = `Indexed ${fresh.entries.length} items`;
    }
  } catch (error) {
    await toast?.hide();
    // Another command won the lock in the meantime: follow its progress instead.
    if (error instanceof IndexBusyError) follow();
    else if (isSignedOut(error)) await handleSignedOut();
    else if (!(error instanceof IndexAbortedError)) {
      await showError(error, "Indexing failed");
      // Fall back to what is saved on disk: it can be newer than memory, e.g. when a background
      // build finished just before this one started.
      const saved = await readIndex();
      if (saved) update({ index: saved });
    }
  } finally {
    building = false;
    if (!following) update({ progress: undefined });
  }
}

let initialized = false;

/** Loads the index once per command run, and resumes an interrupted first crawl. */
async function initialize() {
  if (initialized) return;
  initialized = true;
  const cached = await readIndex();
  update({ index: cached });
  if (cached?.partial) await refreshIndex(true);
}

/**
 * The optional whole-Drive search index. Crawling only happens when the user asks, or to finish an
 * interrupted first crawl; scheduled refreshes run in the Refresh Search Index command.
 */
export function useDriveIndex() {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(state);
    initialize();
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return { index: current.index, progress: current.progress, refresh: refreshIndex };
}
