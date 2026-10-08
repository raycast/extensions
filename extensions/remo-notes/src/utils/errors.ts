import { open, showToast, Toast } from "@raycast/api";
import { buildAppUrl } from "../config";
import { RemoApiError } from "./api";

export async function handleError(error: unknown, title: string) {
  console.error(`[Remo Error] ${title}:`, error);

  let message = error instanceof Error ? error.message : String(error);
  let primaryAction: { title: string; onAction: () => void } | undefined;

  if (error instanceof RemoApiError) {
    if (error.code === "API_KEY_MISSING") {
      message = "API key missing. Add it in the extension preferences.";
      primaryAction = {
        title: "Open API Keys",
        onAction: () => open(buildAppUrl("/settings?tab=apiKeys")),
      };
    } else if (error.code === "API_KEY_INVALID" || error.code === "API_KEY_EXPIRED") {
      message = "Your API key is invalid or expired. Generate a new one in Remo settings.";
      primaryAction = {
        title: "Manage API Keys",
        onAction: () => open(buildAppUrl("/settings?tab=apiKeys")),
      };
    } else if (error.code === "AI_DISABLED") {
      message = "AI features are disabled for this account.";
      primaryAction = {
        title: "Open AI Settings",
        onAction: () => open(buildAppUrl("/settings?tab=ai")),
      };
    } else if (error.code === "RATE_LIMIT_EXCEEDED" || error.status === 429) {
      message = "AI usage limit reached for today. Try again later.";
    } else if (error.status === 404) {
      message = "Requested resource was not found.";
    }
  } else if (
    message.includes("fetch failed") ||
    message.includes("Network request failed") ||
    message.includes("Failed to fetch")
  ) {
    message = "Network error. Please check your internet connection and Convex URL.";
  }

  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction,
  });
}
