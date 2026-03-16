import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { execa } from "execa";

interface Preferences {
  handyBinaryPath: string;
}

export default async function main() {
  const { handyBinaryPath } = getPreferenceValues<Preferences>();
  try {
    await execa(handyBinaryPath, ["--toggle-transcription"]);
    await showHUD("Recording started");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start recording",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
