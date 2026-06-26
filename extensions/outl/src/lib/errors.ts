/**
 * Friendly mapping from `OutlError.code` to a Raycast toast title.
 * Keeps the four command files from repeating the same switch.
 */

import { Toast, showToast } from "@raycast/api";
import { OutlError } from "./cli";

/** Human-readable title for a known error code. */
function titleFor(err: unknown): string {
  if (err instanceof OutlError) {
    switch (err.code) {
      case "NO_WORKSPACE_PREF":
        return "Workspace not set";
      case "NO_WORKSPACE":
        return "Not an outl workspace";
      case "BINARY_NOT_FOUND":
        return "outl binary not found";
      case "PAGE_NOT_FOUND":
        return "Page not found";
      case "SLUG_CONFLICT":
        return "Page already exists";
      case "INVALID_ARG":
        return "Invalid input";
      case "INVALID_DATE":
        return "Invalid date";
      default:
        return "outl error";
    }
  }
  return "Something went wrong";
}

/** Show a failure toast for any thrown error. */
export async function showErrorToast(err: unknown): Promise<void> {
  const message =
    err instanceof Error ? err.message : String(err ?? "unknown error");
  await showToast({
    style: Toast.Style.Failure,
    title: titleFor(err),
    message,
  });
}
