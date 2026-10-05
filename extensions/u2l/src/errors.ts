import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { U2LApiError } from "@u2l/sdk";

export const API_SETTINGS_URL = "https://u2l.ai/app/settings/api";

export function isAuthError(error: unknown): boolean {
  return error instanceof U2LApiError && (error.status === 401 || error.status === 403);
}

export function showApiFailureToast(error: unknown, title: string) {
  return showFailureToast(error, {
    title,
    ...(isAuthError(error)
      ? {
          primaryAction: {
            title: "Open API Settings",
            onAction: (toast) => {
              void open(API_SETTINGS_URL);
              void toast.hide();
            },
          },
        }
      : {}),
  });
}
