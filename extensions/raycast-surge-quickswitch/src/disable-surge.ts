import { Toast, closeMainWindow, getPreferenceValues, showToast } from "@raycast/api";
import api from "./api";

export default async function main() {
  const preferences = getPreferenceValues();
  const xKey = preferences["x-key"];
  const port = preferences["port"];

  try {
    await api(xKey, port).disableSurge();
    await showToast(Toast.Style.Success, "Success", "Surge is disabled");
    closeMainWindow();
  } catch (err) {
    console.error(err);
    await showToast(Toast.Style.Failure, "Failed", "Please check the log");
  }
}
