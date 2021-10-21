import { preferences, showToast, ToastStyle } from "@raycast/api";

export default function useToken(): boolean {
  const token = String(preferences.token.value);

  if (token.length !== 48) {
    showToast(ToastStyle.Failure, "Invalid token detected");
    return false;
  }

  return true;
}
