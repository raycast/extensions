import { BrowserExtension, environment } from "@raycast/api";
import { z } from "zod";

const urlSchema = z.string().url();

export type UrlSource =
  | { readonly kind: "argument"; readonly url: string }
  | { readonly kind: "current-tab"; readonly url: string }
  | { readonly kind: "missing"; readonly reason: string };

export async function getUrlOrCurrentTab(urlArgument: string | undefined): Promise<UrlSource> {
  const trimmed = urlArgument?.trim();

  if (trimmed && trimmed.length > 0) {
    const parsed = urlSchema.safeParse(trimmed);
    if (parsed.success) {
      return { kind: "argument", url: parsed.data };
    }

    return {
      kind: "missing",
      reason: `Invalid URL provided: ${trimmed}`,
    };
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

    const parsed = urlSchema.safeParse(activeUrl);
    if (!parsed.success) {
      return {
        kind: "missing",
        reason: `The current browser tab is not a valid web page URL: ${activeUrl}`,
      };
    }

    return { kind: "current-tab", url: parsed.data };
  } catch (error) {
    if (error instanceof Error && error.message) {
      return {
        kind: "missing",
        reason: `Could not read the current browser tab: ${error.message}`,
      };
    }

    return {
      kind: "missing",
      reason: "Could not read the current browser tab. Make sure the Raycast Browser Extension is installed.",
    };
  }
}
