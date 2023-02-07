import { showToast, Toast, open, closeMainWindow } from "@raycast/api";
import { bundleIdentifier } from "./preferences";
import { getFocusFinderPath } from "./utils";

export default async function main() {
  try {
    const path = await getFocusFinderPath();
    await open(path, bundleIdentifier);
    await closeMainWindow();
  } catch (e) {
    await showToast({
      title: "",
      style: Toast.Style.Failure,
      message: e.message,
    });
  }
}
