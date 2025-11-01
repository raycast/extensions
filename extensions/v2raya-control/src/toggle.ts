import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { getToken, toggleConnection, checkStatus } from "./utils";

export default async function Command() {
  try {
    await closeMainWindow();
    const token = await getToken();
    const status = await checkStatus(token);
    await toggleConnection(token, !status.running);
    const newStatus = await checkStatus(token);
    await showToast({
      title: newStatus.running ? "V2rayA Connected" : "V2rayA Disconnected",
      style: newStatus.running ? Toast.Style.Success : Toast.Style.Failure,
    });
  } catch (error) {
    await showToast({
      title: error instanceof Error ? error.message : "Failed to toggle V2rayA connection",
      style: Toast.Style.Failure,
    });
  }
}
