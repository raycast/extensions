import fs from "node:fs";
import path from "node:path";
import { acquireOwnedLock } from "./owned-lock";
import { environment, showToast, Toast } from "@raycast/api";

/** Excludes index writes, recent-file imports, and data deletion across commands. */
export async function withIndexingLock<T>(
  work: (assertOwned: () => void) => Promise<T>,
  operation: "indexing" | "deletion" | "recent-files" = "indexing",
): Promise<T | undefined> {
  const target = path.join(environment.supportPath, "google-drive-indexing");
  let owned: ReturnType<typeof acquireOwnedLock> | undefined;
  try {
    fs.mkdirSync(environment.supportPath, { recursive: true });
    owned = acquireOwnedLock(target);
    return await work(owned.assertOwned);
  } catch (error) {
    const busy =
      !owned &&
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "ELOCKED";
    await showToast({
      style: Toast.Style.Failure,
      title: busy
        ? operation === "deletion"
          ? "Data was not deleted"
          : "Extension data is busy"
        : operation === "deletion"
          ? "Data deletion stopped"
          : operation === "recent-files"
            ? "Recent-file import stopped"
            : "Google Drive indexing stopped",
      message: busy
        ? "Wait for indexing, recent-file import, or data deletion to finish, then retry. Crash recovery can take ten minutes. If it stays busy after restarting Raycast, see lock recovery in DEVELOPMENT.md."
        : operation === "deletion"
          ? "Some data may already have been removed. Try deleting again."
          : operation === "recent-files"
            ? "Any saved progress was kept. Run Populate from Recent Files to retry."
            : "Previously saved results are still available. Try indexing again.",
    });
  } finally {
    if (owned) {
      try {
        owned.release();
      } catch {
        /* A lost lock must not replace the scan's status. */
      }
    }
  }
}
