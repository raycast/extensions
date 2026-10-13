import { execSync } from "child_process";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { existsSync } from "node:fs";
import { cpus } from "node:os";

export async function nightlight(args: string, state: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();

  // Prefer whichever Homebrew prefix actually has the CLI; fall back to the CPU's default prefix
  const defaultPaths = cpus()[0].model.includes("Apple")
    ? ["/opt/homebrew/bin/nightlight", "/usr/local/bin/nightlight"]
    : ["/usr/local/bin/nightlight", "/opt/homebrew/bin/nightlight"];
  const nightlightPath: string =
    preferences.nightlightPath && preferences.nightlightPath.length > 0
      ? preferences.nightlightPath
      : (defaultPaths.find((path) => existsSync(path)) ?? defaultPaths[0]);

  try {
    execSync(`${nightlightPath} ${args}`);

    await showToast({
      style: Toast.Style.Success,
      title: state,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const msg = "stderr" in e ? String(e.stderr) : "unknown error";
    const notInstalled = msg.includes("command not found") || msg.includes("No such file or directory");

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed",
      message: notInstalled ? "nightlight is not installed. Run: brew install smudge/smudge/nightlight" : msg,
    });
  }
}
