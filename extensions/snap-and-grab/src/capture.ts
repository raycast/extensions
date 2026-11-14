import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { captureScreenshot } from "./native";

export default async function Capture() {
  await closeMainWindow();
  try {
    await captureScreenshot();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not start capture", message: String(error) });
  }
}
