import { LaunchType, launchCommand, showToast, Toast } from "@raycast/api";
import { findAirDroppedFiles, latestTransfer } from "./lib/airdropped";
import { pasteAirDroppedFiles } from "./lib/paste";

export default async function Command() {
  let transfer: Awaited<ReturnType<typeof findAirDroppedFiles>> = [];

  try {
    transfer = latestTransfer(await findAirDroppedFiles());
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not scan the Downloads folder",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (transfer.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No AirDropped files found",
      message: "Files received via AirDrop land in your Downloads folder",
    });
    return;
  }

  if (transfer.length > 1) {
    // The last transfer contained several files — let the user pick.
    await launchCommand({
      name: "search-airdropped-files",
      type: LaunchType.UserInitiated,
      context: { scope: "latest-transfer", intent: "paste" },
    });
    return;
  }

  try {
    await pasteAirDroppedFiles(transfer);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not paste the file",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
