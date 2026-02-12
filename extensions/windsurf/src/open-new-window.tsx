import { showToast, Toast } from "@raycast/api";
import { openNewWindsurfWindow } from "./windsurf";

export default async function Command() {
  try {
    await openNewWindsurfWindow();
    showToast(Toast.Style.Success, "Opened new Windsurf window");
  } catch (error) {
    showToast(Toast.Style.Failure, "Failed to open new window", String(error));
  }
}
