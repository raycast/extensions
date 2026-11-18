import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { execa } from "execa";

export default async function main() {
  const { handyBinaryPath } = getPreferenceValues<Preferences>();
  try {
    await execa(handyBinaryPath, ["--toggle-transcription"]);
    await showHUD("Recording toggled");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle recording",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
