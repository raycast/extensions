/**
 * Raycast glue around the pure client: preferences, the web app's URL,
 * "Open in Nyxe", and failures as toasts.
 */
import {
  type Application,
  getApplications,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { createClient, type NyxeClient } from "./api";
import { describeError } from "./errors";
import { chooseOpenTarget, DEFAULT_WEB_URL, NYXE_DESKTOP_BUNDLE_ID } from "./open";

function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function nyxe(): NyxeClient {
  return createClient({ token: preferences().apiToken });
}

async function desktopApp(): Promise<Application | undefined> {
  try {
    const apps = await getApplications();
    return apps.find((app) => app.bundleId === NYXE_DESKTOP_BUNDLE_ID);
  } catch {
    return undefined;
  }
}

/** Open a thread in the Nyxe app or the browser, per preference and install. */
export async function openThreadInNyxe(threadId: string): Promise<void> {
  const preference = preferences().openIn ?? "auto";
  const target = chooseOpenTarget(threadId, {
    preference,
    appInstalled: preference === "browser" ? false : (await desktopApp()) !== undefined,
  });
  await open(target.url);
}

/** Open the inbox: the desktop app when it's installed and preferred, else the web. */
export async function openInboxInNyxe(): Promise<void> {
  const preference = preferences().openIn ?? "auto";
  const app = preference === "browser" ? undefined : await desktopApp();
  if (app) {
    await open(app.path);
    return;
  }
  await open(`${DEFAULT_WEB_URL}/m`);
}

/** Show a failure as a toast, with the way out when the token is the problem. */
export async function showApiError(err: unknown, fallbackTitle?: string): Promise<void> {
  const described = describeError(err);
  await showToast({
    style: Toast.Style.Failure,
    title: described.offerTokens || !fallbackTitle ? described.title : fallbackTitle,
    message: described.offerTokens || !fallbackTitle ? described.message : (described.message ?? described.title),
    ...(described.offerTokens
      ? {
          primaryAction: {
            title: "Open API Tokens",
            onAction: async (toast) => {
              await toast.hide();
              await open(`${DEFAULT_WEB_URL}/m/settings?tab=api-tokens`);
            },
          },
          secondaryAction: {
            title: "Open Extension Preferences",
            onAction: async (toast) => {
              await toast.hide();
              await openExtensionPreferences();
            },
          },
        }
      : {}),
  });
}

/** Run a state-changing call behind an animated toast that settles to success
 *  or to the mapped failure. Returns whether it succeeded. */
export async function withToast(
  titles: { loading: string; success: string; failure: string },
  run: () => Promise<unknown>,
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: titles.loading });
  try {
    await run();
    toast.style = Toast.Style.Success;
    toast.title = titles.success;
    return true;
  } catch (err) {
    await toast.hide();
    await showApiError(err, titles.failure);
    return false;
  }
}
