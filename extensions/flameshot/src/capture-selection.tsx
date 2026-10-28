import { Clipboard, closeMainWindow, getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { selection } from "./utils/screenshot";

const captureSelectionPreferences = getPreferenceValues<Preferences.CaptureSelection>();
const copyToClipboard = captureSelectionPreferences.copyToClipboard;

export default async function Command(props: LaunchProps<{ arguments: Arguments.CaptureSelection }>) {
  await closeMainWindow({ clearRootSearch: true });
  const screenshot = await selection(Number(props.arguments.delay), props.arguments.pin === "yes");

  if (!screenshot) return;

  await showHUD("Captured selection");

  if (copyToClipboard) await Clipboard.copy({ file: screenshot });
}
