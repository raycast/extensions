import { getSelectedFinderItems, launchCommand, LaunchType, showHUD } from "@raycast/api";
import path from "node:path";
import { getConnectedBoox } from "./discovery/discover";
import { describeBooxError } from "./lib/errors";
import { getBooxPreferences } from "./lib/preferences";
import { normalizeRemotePath } from "./lib/paths";
import { describeTransferSuccess } from "./lib/transfer-feedback";
import { rememberDestination } from "./operations/recent-destinations";
import { transferFiles } from "./operations/transfer";

export default async function QuickSendSelectedFiles() {
  try {
    const selected = await getSelectedFinderItems();
    if (!selected.length) return showHUD("Select files in Finder first");
    const paths = selected.map((item) => item.path);
    const destination = normalizeRemotePath(getBooxPreferences().quickSendDirectory || "/Download");
    const { client, device } = await getConnectedBoox();
    const duplicates = await client.checkDuplicates(
      paths.map((filePath) => path.basename(filePath)),
      destination
    );
    if (duplicates.length) {
      await launchCommand({
        name: "send-to-boox",
        type: LaunchType.UserInitiated,
        context: { paths, mode: "storage", destination },
      });
      return;
    }
    await showHUD(`Sending ${paths.length} file${paths.length === 1 ? "" : "s"} to ${device.model}…`);
    const result = await transferFiles({
      client,
      paths,
      mode: "storage",
      destination,
      conflictPolicy: "skip",
    });
    if (result.failed) {
      await showHUD(`${result.failed} transfer${result.failed === 1 ? "" : "s"} failed`);
      return;
    }
    await rememberDestination(device.id, destination);
    await showHUD(describeTransferSuccess(result, device.model, "storage"));
  } catch (error) {
    await showHUD(describeBooxError(error));
  }
}
