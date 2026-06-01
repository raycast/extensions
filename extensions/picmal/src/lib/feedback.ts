import { open, showInFinder, showToast, Toast } from "@raycast/api";
import { basename } from "path";
import {
  Command,
  CompressArgs,
  ConvertArgs,
  describeResult,
  PICMAL_WEBSITE,
  PicmalNotInstalledError,
  run,
} from "./cli";

/**
 * Run a picmal-cli command with full Raycast toast feedback: an animated toast
 * that tracks per-file progress for video/audio, then resolves to a
 * success / partial / failure toast with the right action (Show in Finder for
 * produced files, Open Picmal when licensing or tooling is the problem).
 */
export async function runAndReport(command: Command, args: ConvertArgs | CompressArgs): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: args.input.length > 1 ? `Processing ${args.input.length} files…` : "Processing…",
  });

  try {
    const result = await run(command, args, (input, percent) => {
      toast.title = `${basename(input)} — ${Math.round(percent)}%`;
    });

    const described = describeResult(result);
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
