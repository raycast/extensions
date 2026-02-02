import { showToast, Toast } from "@raycast/api";

/** Show toast for getUserInfo / fetch failure (UNAUTHORIZED → Session Expired, else Failed to Load). */
export function showFetchUserInfoError(e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "UNAUTHORIZED") {
    showToast({
      style: Toast.Style.Failure,
      title: "Session Expired",
      message: "Run the command again to reconnect.",
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load",
      message: msg,
    });
  }
}
