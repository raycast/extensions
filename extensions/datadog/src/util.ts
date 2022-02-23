import { showToast, Toast, getPreferenceValues } from "@raycast/api";

export const showError = (e: Error) => showToast(Toast.Style.Failure, e.message);
export const linkDomain = () => {
  return getPreferenceValues()["domain"] || "app." + getPreferenceValues()["server"];
};
