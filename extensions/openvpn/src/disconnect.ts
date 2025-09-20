import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { disconnect } from "./utils";

export default async function Command() {
  await closeMainWindow();

  const error = await disconnect();

  if (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error,
    });
  }
}
