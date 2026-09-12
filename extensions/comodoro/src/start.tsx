import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import * as Exec from "./exec";
import * as Binary from "./binary";
import { Preferences } from "./preferences";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const binary = await Binary.has(preferences.binaryPath);

  if (!binary) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Get failed",
      message: `Couldn't find binary at path: ${preferences.binaryPath}`,
    });

    return null;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting",
  });

  const cmd = `${preferences.binaryPath} timer start ${preferences.preset} ${preferences.protocol}`;
  console.debug(`cmd: ${cmd}`);
  const { stderr } = await Exec.run(cmd, {});
  if (stderr) {
    console.log(stderr);

    toast.style = Toast.Style.Failure;
    toast.title = `Failed to start: ${stderr}`;
  } else {
    toast.style = Toast.Style.Success;
    toast.title = "Started";
  }

  return null;
}
