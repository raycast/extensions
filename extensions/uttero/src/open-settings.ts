import { open, closeMainWindow, showToast, Toast } from "@raycast/api";

export default async function main() {
  try {
    await closeMainWindow();
    await open("uttero://settings");
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Uttero is not running", message: "Start Uttero first." });
  }
}
