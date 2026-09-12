import { BrowserExtension, environment } from "@raycast/api";

export type UrlSource =
  | { readonly kind: "argument"; readonly websiteUrl: string }
  | { readonly kind: "current-tab"; readonly websiteUrl: string }
  | { readonly kind: "missing"; readonly reason: string };

function normalizeWebsiteUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function getUrlOrCurrentTab(urlArgument: string | undefined): Promise<UrlSource> {
  const trimmed = urlArgument?.trim();

  if (trimmed && trimmed.length > 0) {
    const websiteUrl = normalizeWebsiteUrl(trimmed);
    return websiteUrl
      ? { kind: "argument", websiteUrl }
      : { kind: "missing", reason: "Enter a valid HTTP(S) URL without credentials." };
  }

  if (!environment.canAccess(BrowserExtension)) {
    return {
      kind: "missing",
      reason: "No URL provided. Install the Raycast Browser Extension to use the current browser tab.",
    };
  }

  try {
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);
    const activeUrl = activeTab?.url?.trim();

    if (!activeUrl || activeUrl.length === 0) {
      return {
        kind: "missing",
        reason: "Could not find an active browser tab URL.",
      };
    }

    const websiteUrl = normalizeWebsiteUrl(activeUrl);
    if (!websiteUrl) {
      return {
        kind: "missing",
        reason: "The active browser tab does not have a valid HTTP(S) URL.",
      };
    }

    return { kind: "current-tab", websiteUrl };
  } catch {
    return {
      kind: "missing",
      reason: "Could not read the active browser tab.",
    };
  }
}
