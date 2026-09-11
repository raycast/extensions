import { Clipboard, closeMainWindow, getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { screen } from "./utils/screenshot";

const captureScreenPreferences = getPreferenceValues<Preferences.CaptureScreen>();
const copyToClipboard = captureScreenPreferences.copyToClipboard;

export default async function Command(props: LaunchProps<{ arguments: Arguments.CaptureScreen }>) {
  await closeMainWindow({ clearRootSearch: true });
  const screenshot = await screen(Number(props.arguments.delay));

  if (!screenshot) return;

  await showHUD("Captured screen");

  if (copyToClipboard) await Clipboard.copy({ file: screenshot });
}
