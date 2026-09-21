import { Application, Color, getApplications, Icon, Image } from "@raycast/api";
import { basename } from "path";
import { Browser, SUPPORTED_BROWSERS } from "../types/browsers";

/** Browser key → absolute path of the installed application bundle. */
export type InstalledBrowsers = Record<string, string>;

/** Lowercase, trim, drop an app/exe suffix, trim again — a name may be padded either side of it. */
const normalize = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\.(app|exe)$/, "")
    .trim();

/**
 * Locate which of our supported browsers are actually installed.
 *
 * Tiers, strongest first: a verified bundle identifier, then the literal `appName` this extension
 * already hands to the launcher, then a normalized form of it. Literal beats normalized so that an
 * unrelated "Opera.exe" cannot outrank the real "Opera".
 *
 * A browser with a verified bundle identifier will never match an application that declares a
 * DIFFERENT identifier — otherwise any app named "Arc" could claim to be Arc once the real one is
 * uninstalled. Applications that declare no identifier stay eligible for name matching.
 */
export async function findInstalledBrowsers(): Promise<InstalledBrowsers> {
  const apps: Application[] = await getApplications();
  const installed: InstalledBrowsers = {};

  for (const browser of SUPPORTED_BROWSERS) {
    const wantedId = browser.bundleId?.toLowerCase();
    // Bundle identifiers are case-insensitive per Apple's CFBundleIdentifier documentation.
    const sameId = (app: Application) => app.bundleId?.toLowerCase() === wantedId;
    const idConflicts = (app: Application) => Boolean(wantedId && app.bundleId && !sameId(app));

    const candidates = apps.filter((app) => app.path && !idConflicts(app));
    const name = browser.appName;

    const match =
      (wantedId ? candidates.find(sameId) : undefined) ??
      (name
        ? (candidates.find((app) => app.name === name) ??
          candidates.find((app) => app.localizedName === name) ??
          candidates.find((app) => normalize(app.name) === normalize(name)) ??
          candidates.find((app) => app.localizedName && normalize(app.localizedName) === normalize(name)) ??
          candidates.find((app) => normalize(basename(app.path)) === normalize(name)))
        : undefined);

    if (match) installed[browser.key] = match.path;
  }
  return installed;
}

/**
 * The absolute path of an installed browser, or `undefined`.
 *
 * The single lookup behind both the icon and the availability check — when those were separate
 * predicates they disagreed, and an empty-string path read as "installed" to one and "missing" to
 * the other.
 */
export function browserAppPath(installed: InstalledBrowsers | undefined, key: string): string | undefined {
  if (!installed || !Object.prototype.hasOwnProperty.call(installed, key)) return undefined;
  return installed[key] || undefined;
}

/**
 * Whether we may offer to launch this browser.
 *
 * `undefined` means discovery has not answered, which is NOT "absent": staying optimistic keeps the
 * Open action present on a slow first launch, and a launch that does fail explains itself in a
 * toast. An empty `{}` is a real answer — discovery ran and found none — and does withhold it.
 */
export function isBrowserAvailable(installed: InstalledBrowsers | undefined, key: string): boolean {
  if (!installed) return true;
  return browserAppPath(installed, key) !== undefined;
}

/**
 * The icon to show for a browser.
 *
 * An installed browser gets its real application icon — the exact app the action will launch, with
 * no network call and nothing to keep in sync when a vendor rebrands. Discovery not having answered
 * yet gets a plain globe, and a browser confirmed missing gets a muted one; those two are
 * deliberately distinct, because the row stays selectable as reference either way.
 *
 * Deliberately NOT `getFavicon`: it resolves on hostname alone, so google.com would return Google's
 * logo rather than Chrome's, and microsoft.com Microsoft's rather than Edge's.
 */
export function browserIcon(browser: Browser, installed: InstalledBrowsers | undefined): Image.ImageLike {
  if (!installed) return Icon.Globe;
  const path = browserAppPath(installed, browser.key);
  return path ? { fileIcon: path } : { source: Icon.Globe, tintColor: Color.SecondaryText };
}
