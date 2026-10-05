import { showToast, Toast } from "@raycast/api";
import { sendWizCommand } from "./utils/wiz";

export default async function Command() {
  try {
    await sendWizCommand("setState", { state: false });
    await showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: "Lights turned OFF",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed",
      message:
        error instanceof Error
          ? error.message
          : "Checking your network connection or IP",
    });
  }
}
