import {
  environment,
  getPreferenceValues,
  Toast,
  showToast,
} from "@raycast/api";
import { indexDatabasePath } from "./index-db";
import { BuildOptions, BuildOutcome, rebuildIndex } from "./index-build";
import { withIndexingLock } from "./indexing-lock";
import { loadIndexSettings } from "./index-settings-store";

/**
 * Raycast wiring for a rebuild.
 *
 * Supplies the three things `rebuildIndex` deliberately does not know: where
 * Raycast keeps this extension's support directory, the lock that serializes
 * rebuilding and deletion, and the user's optional fd path. Keeping them here leaves the
 * orchestration testable.
 */

export function searchIndexPath(): string {
  return indexDatabasePath(environment.supportPath);
}

/**
 * `withLock` defaults to taking the indexing lock. A caller that already holds
 * it passes a pass-through instead: acquiring it
 * twice in one process would deadlock.
 */
export async function rebuildSearchIndex(
  options: Omit<BuildOptions, "file" | "withLock"> & {
    file?: string;
    withLock?: BuildOptions["withLock"];
  } = {},
): Promise<BuildOutcome> {
  return rebuildIndex({
    fdPreference: getPreferenceValues<Preferences>().fdPath,
    loadSettings: loadIndexSettings,
    ...options,
    file: options.file ?? searchIndexPath(),
    withLock: options.withLock ?? ((work) => withIndexingLock(work)),
  });
}

/** Shared feedback for the standalone command and the search action. */
export async function rebuildWithFeedback(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Building search index…",
    message:
      "Scanning configured folders with fd. This can take a few minutes.",
  });
  const outcome = await rebuildSearchIndex({
    onFinishing: () => {
      toast.message = "Writing the search index…";
    },
    onProgress: ({ indexed, scanned, elapsedMs }) => {
      toast.message = `${indexed.toLocaleString()} indexed · ${scanned.toLocaleString()} seen · ${Math.round(elapsedMs / 1000)}s`;
    },
  });
  const complete = outcome.kind === "done" && outcome.report.complete;
  toast.style = complete ? Toast.Style.Success : Toast.Style.Failure;
  toast.title =
    outcome.kind === "done"
      ? complete
        ? "Search index rebuilt"
        : "Search index partly rebuilt"
      : outcome.kind === "no-fd"
        ? "fd is required to build the index"
        : outcome.kind === "no-roots"
          ? "No folders configured for indexing"
          : "The search index could not be built";
  toast.message = outcome.kind === "done" ? outcome.summary : outcome.message;
}
