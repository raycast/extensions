import { open } from "@raycast/api";

/**
 * The macOS bundle identifier of DevT Pro. On macOS, passing this
 * as the second argument to `open()` makes Raycast hand the URL to our app
 * even if another app has registered the `devtpro://` scheme.
 *
 * Bundle identifiers only exist on macOS, so on Windows the link is opened
 * with whichever app registered the `devtpro://` protocol.
 */
export const APP_BUNDLE_ID = "dev.aadhil.developer_tools_pro";

/**
 * DevT Pro website. Linked from error toasts when the app isn't installed so
 * the user can download it.
 */
export const APP_WEBSITE_URL = "https://devtpro.app";

/**
 * Result of {@link openInApp}. If the launch failed, `ok` is `false` and the
 * caller can surface a helpful toast.
 */
export type OpenResult = { ok: true } | { ok: false; reason: "not-installed" | "unknown"; error?: unknown };

/**
 * Open a `devtpro://` deep link in DevT Pro using Raycast's
 * built-in `open` utility.
 *
 * Resolves to an {@link OpenResult} instead of throwing so callers can render
 * friendly toasts.
 *
 * @param deepLink - Full URL string, e.g. "devtpro://formatters/json?input=...".
 */
export async function openInApp(deepLink: string): Promise<OpenResult> {
  try {
    if (process.platform === "darwin") {
      await open(deepLink, APP_BUNDLE_ID);
    } else {
      await open(deepLink);
    }
    return { ok: true };
  } catch (e) {
    // `open()` rejects when the system can't find an app for the bundle id or
    // URL scheme, which in practice means the app isn't installed or hasn't
    // registered `devtpro://` yet.
    const message = e instanceof Error ? e.message : String(e);
    const lower = message.toLowerCase();
    const looksMissing =
      lower.includes("not found") ||
      lower.includes("no application") ||
      lower.includes("could not find") ||
      lower.includes("couldn't be found") ||
      lower.includes("not installed") ||
      lower.includes("no app") ||
      lower.includes("not associated") ||
      lower.includes("no association");
    return { ok: false, reason: looksMissing ? "not-installed" : "unknown", error: e };
  }
}

/**
 * Append the `input` query parameter to a tool's deep link.
 */
export function withInput(deepLink: string, input: string): string {
  const separator = deepLink.includes("?") ? "&" : "?";
  return `${deepLink}${separator}input=${encodeURIComponent(input)}`;
}
