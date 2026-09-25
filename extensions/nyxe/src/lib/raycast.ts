/**
 * Raycast glue around the pure client: preferences, the web app's URL,
 * "Open in Nyxe", and failures as toasts.
 */
import {
  type Application,
  getApplications,
  getPreferenceValues,
  LocalStorage,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { createClient, DEFAULT_API_BASE_URL, normalizeBaseUrl, type NyxeClient } from "./api";
import { describeError } from "./errors";
import { chooseOpenTarget, DEFAULT_WEB_URL, NYXE_DESKTOP_BUNDLE_ID, type OpenInPreference } from "./open";

interface ExtensionPreferences {
  apiToken: string;
  openIn?: OpenInPreference;
  apiBaseUrl?: string;
}

function preferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function nyxe(): NyxeClient {
  const { apiToken, apiBaseUrl } = preferences();
  return createClient({ token: apiToken, baseUrl: apiBaseUrl });
}

/**
 * The web app for the configured deployment. Production is known; any other
 * base URL asks `/me` once and remembers the answer.
 */
export async function webUrl(): Promise<string> {
  const base = normalizeBaseUrl(preferences().apiBaseUrl);
  if (base === DEFAULT_API_BASE_URL) return DEFAULT_WEB_URL;
  const key = `webUrl:${base}`;
  const cached = await LocalStorage.getItem<string>(key);
  if (cached) return cached;
  const me = await nyxe().me();
  await LocalStorage.setItem(key, me.webUrl);
  return me.webUrl;
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
    webUrl: preference === "app" ? DEFAULT_WEB_URL : await webUrl(),
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
  await open(`${await webUrl()}/m`);
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
              await open(`${await webUrl().catch(() => DEFAULT_WEB_URL)}/m/settings?tab=api-tokens`);
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
