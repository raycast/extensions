import { showToast, Toast, getPreferenceValues } from "@raycast/api";

export const showError = (e: Error) => showToast(Toast.Style.Failure, e.message);
export const linkDomain = () => {
  const preferences = getPreferenceValues();
  return preferences.domain || "app." + preferences.server;
};
export function notEmpty<TValue>(value: TValue): value is NonNullable<TValue> {
  return value !== null && value !== undefined && value != "";
}
