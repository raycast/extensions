import { BrowserExtension, Clipboard, environment, getFrontmostApplication } from "@raycast/api";
import { hostFromInput } from "./host";

/**
 * Context the extension reads on open. Everything here is local and
 * permission-free: `getFrontmostApplication` needs no Automation grant, and the
 * browser API is only touched when the user already has the Raycast browser
 * extension (calling it otherwise would prompt to install one).
 */
export interface AppContext {
  name: string;
  bundleId: string;
  path: string;
}

export interface SiteContext {
  host: string;
  title: string | null;
}

const RAYCAST_BUNDLE_ID = "com.raycast.macos";

export async function frontmostApp(): Promise<AppContext | null> {
  try {
    const app = await getFrontmostApplication();
    if (!app.bundleId || app.bundleId === RAYCAST_BUNDLE_ID) return null;
    return { name: app.name, bundleId: app.bundleId, path: app.path };
  } catch {
    return null;
  }
}

/** The active http(s) tab of the frontmost browser, when the browser extension is installed. */
export async function activeSite(): Promise<SiteContext | null> {
  try {
    if (!environment.canAccess(BrowserExtension)) return null;
    const tabs = await BrowserExtension.getTabs();
    const active = tabs.find((tab) => tab.active && /^https?:/i.test(tab.url));
    if (!active) return null;

    const host = hostFromInput(active.url);
    if (!host) return null;
    return { host, title: active.title ?? null };
  } catch {
    return null;
  }
}

export async function clipboardHost(): Promise<string | null> {
  try {
    return hostFromInput(await Clipboard.readText());
  } catch {
    return null;
  }
}

/**
 * The host the user most likely means: an explicit argument, else the tab they
 * are on, else whatever link they last copied.
 */
export async function preferredHost(argument?: string): Promise<string | null> {
  const fromArgument = hostFromInput(argument);
  if (fromArgument) return fromArgument;

  const site = await activeSite();
  if (site) return site.host;

  return clipboardHost();
}
