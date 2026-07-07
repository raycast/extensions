import { Toast, openExtensionPreferences, showToast } from "@raycast/api";

import { ApiError } from "./client";

interface ToastDetails {
  title: string;
  message: string;
  authAction?: boolean;
}

const TOASTS: Record<string, ToastDetails> = {
  API_KEY_REQUIRED: {
    title: "API key missing",
    message: "Add your Userplane API key in Extension Preferences.",
    authAction: true,
  },
  API_KEY_INVALID: {
    title: "Invalid API key",
    message: "Check your key in Extension Preferences.",
    authAction: true,
  },
  API_KEY_EXPIRED: {
    title: "API key expired",
    message: "Rotate your key in the Userplane dashboard.",
    authAction: true,
  },
  API_KEY_DISABLED: {
    title: "API key disabled",
    message: "Create a new key in the Userplane dashboard.",
    authAction: true,
  },
  NOT_A_MEMBER: {
    title: "No workspace access",
    message: "Your API key doesn't have access to this workspace.",
  },
  RATE_LIMITED: {
    title: "Rate limited",
    message: "Too many requests right now. Try again in a moment.",
  },
  PLAN_LIMIT_EXCEEDED: {
    title: "Plan limit reached",
    message: "Upgrade your plan or delete unused links.",
  },
  WORKSPACE_NOT_FOUND: {
    title: "Workspace not found",
    message: "That workspace is no longer accessible.",
  },
  LINK_NOT_FOUND: {
    title: "Link not found",
    message: "That link is no longer available.",
  },
  LINK_DEFAULT_PROJECT_NOT_FOUND: {
    title: "No default project",
    message: "Set a default project in the Userplane dashboard first.",
  },
  LINK_PROJECT_DELETED: {
    title: "Project deleted",
    message: "The project for that domain was deleted.",
  },
  LINK_CREATE_FAILED: {
    title: "Couldn't create link",
    message: "Something went wrong creating that link. Try again in a moment.",
  },
  SERVICE_UNAVAILABLE: {
    title: "Service unavailable",
    message: "Userplane is temporarily unreachable. Try again shortly.",
  },
  REQUEST_TIMEOUT: {
    title: "Request timed out",
    message: "Check your connection and try again.",
  },
  WORKSPACE_SEARCH_TERM_REQUIRED: {
    title: "Search term required",
    message: "Type at least one character to search.",
  },
  WORKSPACE_SEARCH_TYPE_INVALID: {
    title: "Invalid search type",
    message: "Unexpected search scope. Please retry.",
  },
  WORKSPACE_SEARCH_UNAVAILABLE: {
    title: "Search temporarily unavailable",
    message: "Workspace search is offline. Try again shortly.",
  },
};

export async function reportApiError(error: unknown): Promise<void> {
  const details = resolveToast(error);
  await showToast({
    style: Toast.Style.Failure,
    title: details.title,
    message: details.message,
    primaryAction: details.authAction
      ? {
          title: "Open Extension Preferences",
          onAction: () => {
            void openExtensionPreferences();
          },
        }
      : undefined,
  });
}

function resolveToast(error: unknown): ToastDetails {
  if (error instanceof ApiError) {
    if (error.code && TOASTS[error.code]) return TOASTS[error.code];
    if (error.status === 401) return TOASTS.API_KEY_INVALID;
    if (error.status === 403) return TOASTS.NOT_A_MEMBER;
    if (error.status === 408) return TOASTS.REQUEST_TIMEOUT;
    if (error.status === 429) return TOASTS.RATE_LIMITED;
    if (error.status === 503) return TOASTS.SERVICE_UNAVAILABLE;
    return {
      title: "Request failed",
      message: error.message || `HTTP ${error.status}`,
    };
  }
  if (error instanceof Error) {
    return { title: "Network error", message: error.message };
  }
  return { title: "Unknown error", message: "Something went wrong." };
}
