import { Application, Color, Icon, Image, getApplications, open, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const BUNDLE_ID = "com.snapset.Snapset";
export const WEBSITE = "https://snapset.co/";

/** One entry of `Snapset --list --json` (Snapset releases after 1.0.0). */
export interface Layout {
  id: string;
  name: string;
  windows: number;
  hotKey: string | null;
  accent: string;
  setupID: string;
  setupName: string;
  /** Saved on the displays connected right now — the only layouts Snapset will apply here. */
  current: boolean;
  lastAppliedAt: string | null;
  applyURL: string;
}

interface Listing {
  version: number;
  currentSetupID: string;
  layouts: Layout[];
}

export class SnapsetNotInstalledError extends Error {
  constructor() {
    super("Snapset is not installed");
  }
}

/** The installed Snapset predates the JSON listing and the save request. */
export class SnapsetTooOldError extends Error {
  constructor() {
    super("This version of Snapset is too old for the extension");
  }
}

export async function findSnapset(): Promise<Application> {
  const apps = await getApplications();
  const app = apps.find((candidate) => candidate.bundleId === BUNDLE_ID);
  if (!app) throw new SnapsetNotInstalledError();
  return app;
}

/**
 * Reads the saved layouts through Snapset's own command line, which only reads the
 * layouts file and needs no permission.
 *
 * Asked as `--list --json`, not `list --json`: Snapset 1.0 knows `--list` (and prints
 * plain text, which fails to parse below), but treats any other first argument as
 * "launch the app" and would start a second copy next to the running one.
 */
export async function listLayouts(app: Application): Promise<Listing> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(`${app.path}/Contents/MacOS/Snapset`, ["--list", "--json"], {
      timeout: 10_000,
    }));
  } catch (error) {
    // Snapset answers an argument it does not know with "unknown option: …" (exit status 2),
    // which is how a version without the JSON listing would turn it down. Any other failure
    // is a real one and is shown as it is, not as advice to update.
    const stderr = String((error as { stderr?: unknown }).stderr ?? "");
    if (stderr.includes("unknown option")) throw new SnapsetTooOldError();
    throw error;
  }
  try {
    const listing = JSON.parse(stdout) as Listing;
    if (!Array.isArray(listing.layouts)) throw new SnapsetTooOldError();
    return listing;
  } catch {
    throw new SnapsetTooOldError();
  }
}

/**
 * Hands a `snapset://` request to the running Snapset (launching it if needed). Moving
 * windows happens inside Snapset, so Raycast needs no Accessibility permission.
 */
export async function request(app: Application, action: "apply" | "save", query: Record<string, string> = {}) {
  // Percent-encoded, not URLSearchParams: that writes spaces as "+", and Snapset reads the
  // query the RFC 3986 way, where "+" is a plus sign — "Deep Work" would be saved as "Deep+Work".
  const params = Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  await open(`snapset://${action}${params ? `?${params}` : ""}`, app.path);
}

/**
 * `request` for actions that close Raycast first: a failure can no longer be shown in the
 * window, so it is said in a HUD instead of being lost.
 */
export async function requestOrReport(app: Application, action: "apply" | "save", query: Record<string, string> = {}) {
  try {
    await request(app, action, query);
  } catch {
    await showHUD(
      action === "apply"
        ? "Could not reach Snapset — the layout was not applied"
        : "Could not reach Snapset — nothing was saved",
    );
  }
}

const ACCENTS: Record<string, Color | string> = {
  red: Color.Red,
  orange: Color.Orange,
  yellow: Color.Yellow,
  green: Color.Green,
  teal: "#30B0C7",
  cyan: "#32ADE6",
  blue: Color.Blue,
  indigo: "#5856D6",
  purple: Color.Purple,
  pink: Color.Magenta,
  brown: "#A2845E",
  graphite: "#8E8E93",
  black: Color.PrimaryText,
};

/** The layout's color in Snapset, so the list reads like the app's own. */
export function layoutIcon(layout: Layout): Image.ImageLike {
  return { source: Icon.AppWindowGrid2x2, tintColor: ACCENTS[layout.accent] ?? Color.Blue };
}
