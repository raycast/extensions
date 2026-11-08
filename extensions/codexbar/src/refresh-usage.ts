import { Toast, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isAppMissing } from "./lib/errors";
import { percentLabel } from "./lib/format";
import { refreshUsage } from "./lib/store";
import { tightestWindow } from "./lib/usage";
import { percentMode } from "./lib/ui";

export default async function Command() {
  await showToast({ style: Toast.Style.Animated, title: "Refreshing usage", message: "This can take ~30s" });
  try {
    const usage = await refreshUsage();
    const mode = percentMode();
    const parts = usage
      .filter((entry) => !entry.error)
      .map((entry) => {
        const window = tightestWindow(entry);
        return window ? `${entry.name} ${percentLabel(window.usedPercent, mode)}` : undefined;
      })
      .filter(Boolean);
    const failed = usage.filter((entry) => entry.error).length;
    const suffix = failed > 0 ? ` (${failed} unavailable)` : "";
    await showHUD(parts.length > 0 ? `${parts.join(" · ")}${suffix}` : `No limits reported${suffix}`);
  } catch (error) {
    await showFailureToast(error, {
      title: isAppMissing(error) ? "CodexBar is not installed" : "Could not refresh usage",
    });
  }
}
