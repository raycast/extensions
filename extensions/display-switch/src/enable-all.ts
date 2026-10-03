import { showHUD, showToast, Toast } from "@raycast/api";
import { controller, errorMessage } from "./backend";
export default async function Command() {
  try {
    await controller.enableAll();
    await showHUD("All displays enabled");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Enable Displays",
      message: errorMessage(error),
    });
  }
}
