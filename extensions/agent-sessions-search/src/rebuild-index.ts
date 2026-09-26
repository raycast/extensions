import { showToast, Toast } from "@raycast/api";
import { runIndex } from "./lib/index-runner";
import { configureFromPreferences } from "./lib/raycast-config";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Rebuilding sessions index…" });
  configureFromPreferences();
  const summary = await runIndex({
    mode: "rebuild",
    onProgress: (p) => {
      toast.message = `${p.done}/${p.total}`;
    },
  });
  toast.style = Toast.Style.Success;
  toast.title = `Indexed ${summary.indexed} sessions`;
  toast.message = `${(summary.durationMs / 1000).toFixed(1)}s`;
}
