import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { StarlingApiError } from "./starling";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof StarlingApiError && (error.status === 401 || error.status === 403);
}

export async function showStarlingErrorToast(error: unknown, title: string): Promise<void> {
  if (error instanceof StarlingApiError && (error.status === 401 || error.status === 403)) {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message: "Token invalid, expired, or missing required scope.",
    });
    return;
  }

  if (error instanceof StarlingApiError && error.status === 429) {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message: error.message || "Rate limit reached. Please retry later.",
    });
    return;
  }

  await showFailureToast(error, { title });
}
