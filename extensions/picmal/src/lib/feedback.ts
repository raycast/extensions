import { open, showInFinder, showToast, Toast } from "@raycast/api";
import { basename } from "path";
import { Command, describeResult, PICMAL_WEBSITE, PicmalNotInstalledError, run, RunArgs } from "./cli";

/** Merge/build commands produce one new file, so a "saved %" figure doesn't apply. */
function isBuilder(command: Command): boolean {
  return (
    command === "combine" ||
    command === "images-to-pdf" ||
    command === "merge-audio" ||
    command === "combine-videos" ||
    command === "split-pdf" ||
    command === "app-icon"
  );
}

/**
 * Run a picmal-cli command with full Raycast toast feedback: an animated toast
 * that tracks per-file progress for video/audio, then resolves to a
 * success / partial / failure toast with the right action (Show in Finder for
 * produced files, Open Picmal when licensing or tooling is the problem).
 */
export async function runAndReport(command: Command, args: RunArgs): Promise<void> {
  const builds = isBuilder(command);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: args.input.length > 1 ? `Processing ${args.input.length} files…` : "Processing…",
  });

  try {
    const result = await run(command, args, (input, percent) => {
      toast.title = `${basename(input)} — ${Math.round(percent)}%`;
    });

    const described = describeResult(result, {
      showSavings: !builds,
      outputNoun:
        command === "combine" || command === "images-to-pdf" ? "PDF" : command === "app-icon" ? "icon" : "file",
    });
    // Raycast has no "warning" toast — partial batches use Failure so they read as
    // needing attention, while the title still surfaces how many succeeded.
    toast.style = described.kind === "success" ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = described.title;
    toast.message = described.message;

    if (described.revealPath) {
      const revealPath = described.revealPath;
      toast.primaryAction = {
        title: "Show in Finder",
        shortcut: { modifiers: ["cmd", "shift"], key: "f" },
        onAction: () => showInFinder(revealPath),
      };
    } else if (described.offerGetPicmal) {
      toast.primaryAction = { title: "Open Picmal", onAction: () => open(PICMAL_WEBSITE) };
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    if (error instanceof PicmalNotInstalledError) {
      toast.title = "Picmal isn’t installed";
      toast.message = "Install Picmal to convert and compress files.";
      toast.primaryAction = { title: "Get Picmal", onAction: () => open(PICMAL_WEBSITE) };
    } else {
      toast.title = "Something went wrong";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }
}
