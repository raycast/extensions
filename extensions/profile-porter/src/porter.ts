import { getApplications, open, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** The app's bundle ID: how it's found wherever it's installed. */
const bundleId = "com.rahmakyan.profile-porter";

/** A browser profile, as `ProfilePorter --profiles` prints it. */
export type Profile = {
  /** What profileporter://open?profile= takes. */
  key: string;
  browser: string;
  name: string;
  email: string;
  label: string;
  /** The browser's app, for its icon. */
  app: string;
};

/** Where Profile Porter is installed; undefined when it isn't. */
async function appPath(): Promise<string | undefined> {
  return (await getApplications()).find((a) => a.bundleId === bundleId)?.path;
}

/** Every profile Profile Porter knows, in its own order. */
export async function profiles(): Promise<Profile[]> {
  const app = await appPath();
  if (!app) throw new Error("Profile Porter isn't installed. Get it at profileporter.com.");
  const { stdout } = await run(`${app}/Contents/MacOS/ProfilePorter`, ["--profiles"], { timeout: 10_000 });
  return JSON.parse(stdout) as Profile[];
}

/** "github.com/x" is a link too; anything else isn't. */
export function asLink(text: string | undefined): string | undefined {
  const t = (text ?? "").trim();
  if (!t || /\s/.test(t)) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$|\?|#|:)/i.test(t) ? `https://${t}` : undefined;
}

/** A profileporter:// link (app/Sources/Engine/Scheme.swift). */
export function porterLink(
  action: "open" | "search" | "panel",
  values: Record<string, string | undefined> = {},
): string {
  const query = Object.entries(values)
    .filter((pair): pair is [string, string] => pair[1] !== undefined && pair[1] !== "")
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("&");
  return `profileporter://${action}${query ? `?${query}` : ""}`;
}

/** Hands a profileporter:// link to the app; a notice when it isn't there. */
export async function send(link: string): Promise<boolean> {
  if (!(await appPath())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Profile Porter isn't installed",
      message: "profileporter.com",
    });
    return false;
  }
  await open(link);
  return true;
}
