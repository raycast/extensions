import { LocalStorage, confirmAlert, showToast, Toast } from "@raycast/api";
import { DRIVE_SETUP_KEY, indexGoogleDriveLocked } from "./drive-setup";
import { populateRecentFilesLocked, RECENT_CACHE_LIMIT } from "./recent-setup";
import { withIndexingLock } from "./indexing-lock";
import { dataGeneration } from "./storage-lock";
import type { RecentEntry } from "./recent-files";

export type SetupStep = "recents" | "drive";
export type SetupState = Record<SetupStep, boolean> & { hasRun: boolean };
const SETUP_RUN_KEY = "search-setup-run";

export async function loadSearchSetup(): Promise<SetupState> {
  const [recentChoice, drive, hasRun] = await Promise.all([
    LocalStorage.getItem("recent-files-setup"),
    LocalStorage.getItem(DRIVE_SETUP_KEY),
    LocalStorage.getItem(SETUP_RUN_KEY),
  ]);
  return {
    recents: recentChoice !== "done" && recentChoice !== "skipped",
    drive: drive !== "done" && drive !== "skipped",
    hasRun:
      hasRun === "started" ||
      [recentChoice, drive].some(
        (choice) => choice === "done" || choice === "partial",
      ),
  };
}

export function confirmSearchSetup(
  state: Record<SetupStep, boolean>,
): Promise<boolean> {
  const steps = [
    state.recents &&
      "Import documents opened in the last seven days within your home folder, plus their parent folders and immediate contents.",
    state.drive &&
      "Index Google Drive shortcuts and shared-folder contents that Spotlight cannot find.",
  ].filter(Boolean);
  return confirmAlert({
    title: "Set Up Search?",
    message:
      steps.join(" ") +
      " Only paths and metadata are stored, on this Mac. Your recorded usage is not changed. You can stop setup at any time.",
    primaryAction: { title: "Set Up Search" },
    dismissAction: { title: "Cancel" },
  });
}

export async function skipSearchSetup(
  step: SetupStep,
  generation = dataGeneration(),
) {
  return withIndexingLock(async (assertOwned) => {
    if (generation !== dataGeneration()) return false;
    const previous = await loadSearchSetup();
    if (generation !== dataGeneration()) return false;
    // Preserve evidence from older setup versions before replacing a partial choice.
    if (previous.hasRun) {
      assertOwned();
      await LocalStorage.setItem(SETUP_RUN_KEY, "started");
    }
    assertOwned();
    await LocalStorage.setItem(
      step === "recents" ? "recent-files-setup" : DRIVE_SETUP_KEY,
      "skipped",
    );
    return true;
  });
}

/** One lock covers both steps, including the transition between them. */
export async function runSearchSetup(
  options: {
    signal?: AbortSignal;
    generation?: string;
    /** Explicitly refresh both sources when setup has no unfinished steps. */
    rerun?: boolean;
    onStage?: (step: SetupStep) => void;
    onRecentProgress?: (entries: RecentEntry[]) => void;
    onDriveProgress?: (message: string) => void;
    onStatus?: (message: string) => void;
  } = {},
) {
  const generation = options.generation ?? dataGeneration();
  return withIndexingLock(async (assertOwned) => {
    const current = () =>
      !options.signal?.aborted && generation === dataGeneration();
    if (!current()) return;
    const pending = options.rerun
      ? { recents: true, drive: true }
      : await loadSearchSetup();
    const summaries: string[] = [];
    if (!current()) return;
    if (pending.recents || pending.drive) {
      assertOwned();
      await LocalStorage.setItem(SETUP_RUN_KEY, "started");
      if (!current()) return;
      if (options.rerun) {
        assertOwned();
        await Promise.all([
          LocalStorage.setItem("recent-files-setup", "pending"),
          LocalStorage.setItem(DRIVE_SETUP_KEY, "pending"),
        ]);
        if (!current()) return;
      }
    }
    if (pending.recents) {
      options.onStage?.("recents");
      await populateRecentFilesLocked(assertOwned, {
        signal: options.signal,
        budgetMs: 60_000,
        metadataBudgetMs: 15_000,
        maxDocuments: 500,
        maxFolders: 50,
        maxPerFolder: 500,
        maxEntries: RECENT_CACHE_LIMIT,
        onStatus: options.onStatus,
        onSummary: (message) => summaries.push(message),
        onProgress: options.onRecentProgress,
      });
    }
    if (!current()) return;
    if (pending.drive) {
      options.onStage?.("drive");
      await indexGoogleDriveLocked(assertOwned, {
        signal: options.signal,
        budgetMs: 600_000,
        onSummary: (message) => summaries.push(message),
        onProgress: (message) => {
          options.onDriveProgress?.(message);
          options.onStatus?.(message);
        },
      });
    }
    const remaining = await loadSearchSetup();
    if (!current()) return;
    const unfinished = [
      remaining.recents && "Recent files",
      remaining.drive && "Google Drive",
    ]
      .filter(Boolean)
      .join(" and ");
    await showToast({
      style: Toast.Style.Success,
      title: unfinished ? "Search setup incomplete" : "Search setup finished",
      message: unfinished
        ? summaries.join(" ") +
          " Saved results remain searchable. Open Actions → Set Up Search to retry, or skip the unfinished step in Actions."
        : "The selected sources are ready to search. Use Actions → Set Up Search or the standalone commands to refresh them later.",
    });
    return remaining;
  });
}
