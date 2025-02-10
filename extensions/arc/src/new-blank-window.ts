import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { makeNewBlankWindow } from "./arc";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewBlankWindow();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed opening a new blank window",
    });
  }
}
