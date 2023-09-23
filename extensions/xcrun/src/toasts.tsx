import { showToast, Toast } from "@raycast/api";

export async function showCouldntLoadDeviceToast() {
  await showToast({ title: "Couldn't get device", style: Toast.Style.Failure });
}
export async function showBundleIdEmptyToast() {
  await showToast({ title: "Bundle ID should not be empty.", style: Toast.Style.Failure });
}
export async function showExecutedToast() {
  await showToast({ title: "Executed" });
}
