import { showToast, ToastStyle, getPreferenceValues } from "@raycast/api";

export const showError = (e: Error) => showToast(ToastStyle.Failure, e.message);
export const linkDomain = () => {
  return getPreferenceValues()["domain"] || "app." + getPreferenceValues()["server"];
};
