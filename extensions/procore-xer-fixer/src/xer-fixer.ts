import {
  Clipboard,
  getSelectedFinderItems,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import * as path from "node:path";
import { repairProcoreXer, XerRepairValidationError } from "./lib/xerRepair";

/**
 * Raycast entry: repairs every selected `.xer` using Finder / File Explorer selection.
 * Outputs go to a `fixed-xer` folder next to each source file.
 */
export default async function command(): Promise<void> {
  let items;
  try {
    items = await getSelectedFinderItems();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read the file selection",
      message:
        "Select your .xer in Finder or File Explorer, then run this command again.",
    });
    return;
  }

  const xerPaths = items
    .map((i) => i.path)
    .filter((p) => p.toLowerCase().endsWith(".xer"));

  if (xerPaths.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No .xer file selected",
      message:
        "Select one or more Primavera .xer files, then run this command.",
    });
    return;
  }

  const messages: string[] = [];
  let firstOutputDir: string | undefined;

  for (const xerPath of xerPaths) {
    try {
      const result = await repairProcoreXer(xerPath);
      firstOutputDir ??= result.outputDirectory;
      messages.push(
        `${path.basename(xerPath)} → ${path.basename(result.outputXerPath)}`,
      );
    } catch (e) {
      const msg =
        e instanceof XerRepairValidationError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      messages.push(`${path.basename(xerPath)}: FAILED — ${msg}`);
    }
  }

  const summary = messages.join("\n");
  const anyFailed = messages.some((m) => m.includes("FAILED"));

  const toastOptions: Toast.Options = {
    style: anyFailed ? Toast.Style.Failure : Toast.Style.Success,
    title: anyFailed ? "Some files failed" : "XER repair complete",
    message:
      xerPaths.length === 1
        ? (messages[0] ?? "")
        : `${xerPaths.length} file(s) processed`,
    primaryAction: {
      title: "Copy details",
      onAction: () => {
        void Clipboard.copy(summary);
      },
    },
  };

  if (firstOutputDir !== undefined) {
    toastOptions.secondaryAction = {
      title: "Reveal fixed-xer folder",
      onAction: async () => {
        try {
          await showInFinder(firstOutputDir);
        } catch {
          await Clipboard.copy(firstOutputDir);
          await showToast({
            style: Toast.Style.Animated,
            title: "Reveal failed; copied folder path",
          });
        }
      },
    };
  }

  await showToast(toastOptions);
}
