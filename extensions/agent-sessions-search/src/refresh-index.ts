import { environment, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { runIndex } from "./lib/index-runner";
import { configureFromPreferences } from "./lib/raycast-config";

/** Background (interval) command: keep the index fresh so searches are instant. */
export default async function Command() {
  configureFromPreferences();
  const summary = await runIndex({ mode: "refresh" });
  const when = new Date().toLocaleTimeString(undefined, { timeStyle: "short" });
  await updateCommandMetadata({ subtitle: `Last refresh ${when} · ${summary.indexed} updated` });
  if (environment.launchType === "userInitiated") {
    await showToast({
      style: Toast.Style.Success,
      title:
        summary.indexed === 0 && summary.removed === 0
          ? "Index already up to date"
          : `Indexed ${summary.indexed} sessions`,
      message: `${summary.scanned} transcripts scanned in ${(summary.durationMs / 1000).toFixed(1)}s`,
    });
  }
}
