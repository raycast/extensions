import { Toast, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { loadProfilePrefs } from "./components/profiles";
import { isAppMissing, isDataMissing } from "./lib/errors";
import { formatDuration, percentLabel } from "./lib/format";
import { headline } from "./lib/limits";
import { applyPrefs } from "./lib/profile-prefs";
import { staleProfiles, tightestWindow } from "./lib/profiles";
import { loadUsage } from "./lib/store";
import { percentMode } from "./lib/ui";

export default async function Command() {
  try {
    const usage = applyPrefs(await loadUsage(), await loadProfilePrefs());
    const mode = percentMode();
    const now = new Date();
    const lines = usage.flatMap((entry) => {
      const window = tightestWindow(entry);
      if (!window) return [];
      return [
        usage.length === 1
          ? headline(window, mode, now)
          : `${entry.name}: ${window.title} ${percentLabel(window.usedPercent, mode)}`,
      ];
    });
    if (lines.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No limits to show",
        message: "Open Claude Usage and let it refresh, or show a profile with Manage Profiles",
      });
      return;
    }
    const stale = staleProfiles(usage, now);
    if (stale.length > 0) {
      // Old numbers are shown as a warning, never as a plain success HUD.
      const age = stale[0].updatedAt ? formatDuration(now.getTime() - stale[0].updatedAt.getTime()) : undefined;
      await showToast({
        style: Toast.Style.Failure,
        title: age ? `Usage is ${age} old: open Claude Usage` : "Usage was never updated: open Claude Usage",
        message: `Last known: ${lines.join(" · ")}`,
      });
      return;
    }
    await showHUD(lines.join(" · "));
  } catch (error) {
    await showFailureToast(error, {
      title: isAppMissing(error)
        ? "Claude Usage is not installed"
        : isDataMissing(error)
          ? "Claude Usage has no data yet"
          : "Could not read Claude Usage data",
    });
  }
}
