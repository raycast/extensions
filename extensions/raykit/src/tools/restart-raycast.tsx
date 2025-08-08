

import { showToast, ToastStyle } from "@raycast/api";
import { exec } from "child_process";

export default async function Command() {
  try {
    exec(`osascript -e 'quit app "Raycast"' && open -a Raycast`);
    await showToast({
      style: ToastStyle.Success,
      title: "Raycast restarted",
    });
  } catch (err) {
    await showToast({
      style: ToastStyle.Failure,
      title: "Failed to restart Raycast",
      message: String(err),
    });
  }
}