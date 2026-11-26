import { LaunchProps, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openResult } from "./lib/launch";
import { pickHex } from "./lib/pick";
import { ContrastContext } from "./lib/types";

/**
 * Picks the text color, then the background color, with the native macOS eyedropper,
 * and opens the result. "Check Contrast" also launches this command to pick one color again.
 */
export default async function Command(props: LaunchProps<{ launchContext?: ContrastContext }>) {
  const context = props.launchContext ?? {};
  const pick = context.pick ?? "both";
  const kept: ContrastContext = { foreground: context.foreground, background: context.background };

  await closeMainWindow({ clearRootSearch: true });

  try {
    let { foreground, background } = kept;

    if (pick !== "background") {
      if (pick === "both") await showHUD("Pick the text color · Esc to cancel");
      const picked = await pickHex();
      if (!picked) return cancel(pick, kept);
      foreground = picked;
    }

    if (pick !== "foreground") {
      if (pick === "both") await showHUD(`Text ${foreground} · now pick the background`);
      const picked = await pickHex();
      if (!picked) return cancel(pick, kept);
      background = picked;
    }

    await openResult({ foreground, background });
  } catch (error) {
    await showFailureToast(error, { title: "Could not pick the color" });
  }
}

/** Escape during a single re-pick goes back to the result with the old colors. Escape in a full pick just stops. */
async function cancel(pick: ContrastContext["pick"], kept: ContrastContext) {
  if (pick !== "both" && kept.foreground && kept.background) {
    await openResult(kept);
    return;
  }
  await showHUD("Contrast check cancelled");
}
