import { Toast, closeMainWindow, getPreferenceValues, showToast } from "@raycast/api";
import api from "./api";

export default async function main() {
  const preferences = getPreferenceValues();
  const xKey = preferences["x-key"];
  const port = preferences["port"];

  try {
    await api(xKey, port).enableSurge();
    await showToast(Toast.Style.Success, "Success", "Surge is enabled.");
    closeMainWindow();
  } catch (err) {
    await showToast(Toast.Style.Failure, "Failed", "Please check the log");
  }
}
