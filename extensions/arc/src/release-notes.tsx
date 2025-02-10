import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { makeNewTab } from "./arc";

const url = "https://resources.arc.net/hc/en-us/articles/20498285812375-Release-Notes";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewTab(url);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed opening Arc Release Notes",
    });
  }
}
