import { environment, LaunchType, showHUD } from "@raycast/api";
import { refreshMenuBar, refreshQuotes } from "./market";

export default async function Command() {
  const report = await refreshQuotes(undefined, { force: true });
  // Repaint the menu bar from the cache we just wrote. renderOnly so the
  // menu-bar background render does not re-fetch the same quotes. Safe (no
  // re-entrant deadlock): by the time this runs, the menu-bar worker that
  // launched us has already unloaded -- it only stayed alive for the launch IPC.
  await refreshMenuBar({ renderOnly: true });
  if (environment.launchType === LaunchType.UserInitiated) {
    await showHUD(
      report.failures.length
        ? `Updated ${report.updatedIds.length}; ${report.failures.length} failed`
        : `Updated ${report.updatedIds.length} quote${report.updatedIds.length === 1 ? "" : "s"}`,
    );
  }
}
