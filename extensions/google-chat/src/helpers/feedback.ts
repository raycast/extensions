/** Toasts and opening links. Uses Raycast APIs, so it isn't unit tested. */

import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";

import { google } from "../api/google";
import { signOutAndClearCaches } from "../api/session";
import { describeError } from "./errors";

/** The app chosen in the "Open With" preference, if any. */
export function openWithApp() {
  return getPreferenceValues<Preferences>().openWith;
}

/** Opens a Google Chat link in the "Open With" app or the default browser. */
export async function openInChat(url: string): Promise<void> {
  await open(url, openWithApp());
}

/**
 * Shows a readable failure toast. Sign-in problems (expired, missing scope, non-Workspace account)
 * get a "Sign in Again" action that signs out, signs in, and calls `retry`.
 */
export async function showChatError(error: unknown, retry?: () => void): Promise<void> {
  const friendly = describeError(error);
  await showToast({
    style: Toast.Style.Failure,
    title: friendly.title,
    message: friendly.message,
    primaryAction: friendly.signInAgain
      ? {
          title: "Sign in Again",
          onAction: async (toast) => {
            await toast.hide();
            await signOutAndClearCaches();
            await google.authorize();
            retry?.();
          },
        }
      : undefined,
  });
}
