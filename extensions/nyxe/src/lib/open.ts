/**
 * Where "Open in Nyxe" goes: the desktop app's `nyxe://thread/<id>` link when
 * the app is installed, the web app otherwise — unless the user's preference
 * pins one.
 */

export const NYXE_DESKTOP_BUNDLE_ID = "app.nyxe.desktop";
export const DEFAULT_WEB_URL = "https://nyxe.app";

export type OpenInPreference = "auto" | "app" | "browser";

export type OpenTarget = { kind: "app"; url: string } | { kind: "browser"; url: string };

/** JMAP ids: RFC 8620 §1.2's charset. Anything else never reaches a URL. */
const THREAD_ID = /^[A-Za-z0-9_-]{1,255}$/;

export function threadWebUrl(threadId: string, webUrl: string = DEFAULT_WEB_URL): string {
  return `${webUrl.replace(/\/+$/, "")}/m?thread=${encodeURIComponent(threadId)}`;
}

export function chooseOpenTarget(
  threadId: string,
  {
    preference,
    appInstalled,
    webUrl = DEFAULT_WEB_URL,
  }: {
    preference: OpenInPreference;
    appInstalled: boolean;
    webUrl?: string;
  },
): OpenTarget {
  const useApp = THREAD_ID.test(threadId) && (preference === "app" || (preference === "auto" && appInstalled));
  return useApp
    ? { kind: "app", url: `nyxe://thread/${threadId}` }
    : { kind: "browser", url: threadWebUrl(threadId, webUrl) };
}
