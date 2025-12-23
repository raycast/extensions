import { Toast, showToast } from "@raycast/api";
import { formatMiseError, runPrune } from "./tools/mise";

export default async function PruneCommand() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Pruning unused tool versions" });
  try {
    const result = await runPrune();
    const summary = summarizePruneOutput(result.stdout);
    toast.style = Toast.Style.Success;
    toast.title = "Prune complete";
    toast.message = summary;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Prune failed";
    toast.message = formatMiseError(error);
  }
}

function summarizePruneOutput(output: string) {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "No files removed.";
  }

  const preview = lines.slice(0, 2).join(" · ");
  return lines.length > 2 ? `${preview} · +${lines.length - 2} more` : preview;
}
