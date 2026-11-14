import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { checkScanner, scanOnce } from "swift:../swift";
import { buildOptions, errorMessage } from "./scanner";

export default async function Command() {
  const options = buildOptions({ timeoutSeconds: 30 });
  try {
    await checkScanner(options, true);
  } catch (error) {
    await showFailureToast(error, { title: "Could not scan" });
    return;
  }
  await closeMainWindow();
  try {
    if (!(await scanOnce(options))) await showHUD("No barcode scanned");
  } catch (error) {
    await showHUD(errorMessage(error));
  }
}
