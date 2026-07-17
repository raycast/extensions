import { execSync } from "child_process";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { cpus } from "node:os";

export async function nightlight(args: string, state: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();

  const nightlightPath: string =
    preferences.nightlightPath && preferences.nightlightPath.length > 0
      ? preferences.nightlightPath
      : cpus()[0].model.includes("Apple")
        ? "/opt/homebrew/bin/nightlight"
        : "/usr/local/bin/nightlight";

  try {
    execSync(`${nightlightPath} ${args}`);

    await showToast({
      style: Toast.Style.Success,
      title: state,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const msg = "stderr" in e ? e.stderr : "unknown error";

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed",
      message: msg.includes("nightlight: command not found") ? "Please install nightlight." : msg,
    });
  }
}
