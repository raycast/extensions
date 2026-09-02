import { LaunchType, launchCommand, showHUD, showToast, Toast } from "@raycast/api";
import { copyFilesToClipboard, findAirDroppedFiles, latestTransfer } from "./lib/airdropped";

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
      context: { scope: "latest-transfer", intent: "copy" },
    });
    return;
  }

  try {
    await copyFilesToClipboard([transfer[0].path]);
    await showHUD(`Copied ${transfer[0].name}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not copy the file",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
