import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { checkStatus, getToken } from "./utils";

export default async function Command() {
  try {
    await closeMainWindow();
    const token = await getToken();
    const status = await checkStatus(token);
    await showToast({
      title: status.running ? "V2rayA Connected" : "V2rayA Disconnected",
      style: status.running ? Toast.Style.Success : Toast.Style.Failure,
    });
  } catch (error) {
    await showToast({
      title: error instanceof Error ? error.message : "Unknown error occurred",
      style: Toast.Style.Failure,
    });
  }
}
