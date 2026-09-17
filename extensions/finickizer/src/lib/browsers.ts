import type { Application } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Finicky routes links; offering it as a target would loop. */
const EXCLUDED_BUNDLE_IDS = new Set(["se.johnste.finicky"]);

/** The apps that declare the http or https URL scheme, i.e. the ones macOS would offer as a default browser. */
export async function browserApps(apps: Application[]): Promise<Application[]> {
  const flags = await mapWithLimit(apps, 12, claimsHttp);
  return apps.filter((app, index) => flags[index] && !EXCLUDED_BUNDLE_IDS.has(app.bundleId ?? ""));
}

async function claimsHttp(app: Application): Promise<boolean> {
  try {
    const plist = join(app.path, "Contents", "Info.plist");
    const { stdout } = await run("/usr/bin/plutil", ["-convert", "xml1", "-o", "-", plist], { maxBuffer: 8 << 20 });
    const types = urlTypesBlock(stdout).match(/<dict>[\s\S]*?<\/dict>/g) ?? [];
    // LSHandlerRank "None" is an app's way of saying it never wants to be the handler (VLC does this).
    return types.some(
      (type) =>
        /<string>https?<\/string>/i.test(type) && !/<key>LSHandlerRank<\/key>\s*<string>None<\/string>/.test(type),
    );
  } catch {
    return false;
  }
}

/** The balanced `<array>…</array>` that follows `<key>CFBundleURLTypes</key>`, or "" when absent or empty. */
function urlTypesBlock(xml: string): string {
  const key = xml.indexOf("<key>CFBundleURLTypes</key>");
  if (key === -1 || !/^\s*<array>/.test(xml.slice(key + 27, key + 40))) return "";
  const tokens = /<array>|<\/array>/g;
  tokens.lastIndex = key;
  let depth = 0;
  let begin = -1;
  for (let token = tokens.exec(xml); token; token = tokens.exec(xml)) {
    if (token[0] === "<array>") {
      if (depth === 0) begin = token.index;
      depth++;
    } else if (--depth === 0) {
      return xml.slice(begin, token.index);
    }
  }
  return "";
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** A browser saved by Manage Browsers. `path` identifies the app; `bundleId` is the fallback if the app moved. */
export type StoredBrowser = { name: string; path: string; bundleId?: string };

/** A stored browser resolved against the installed apps. `spec` is how Finicky rules name the app. */
export type Browser = { app: Application; spec: string };

export const STORAGE_KEY = "browsers";

const APP_NAME = /^[a-zA-Z0-9 ]+$/;

/** Mirrors Finicky's string heuristic: a plain name when it is one, otherwise the bundle id, otherwise the path. */
function finickySpec(app: Application): string {
  if (APP_NAME.test(app.name)) return app.name;
  return app.bundleId ?? app.path;
}

/** The installed app a rule's browser spec refers to, if any. */
export function findAppBySpec(spec: string, apps: Application[]): Application | undefined {
  return (
    apps.find((app) => finickySpec(app) === spec) ??
    apps.find((app) => app.name === spec || app.bundleId === spec || app.path === spec)
  );
}

export function toStored(app: Application): StoredBrowser {
  return { name: app.name, path: app.path, bundleId: app.bundleId };
}

export function isSameApp(stored: StoredBrowser, app: Application): boolean {
  return stored.path === app.path || (!!stored.bundleId && stored.bundleId === app.bundleId);
}

/** Stored browsers, in stored order, that are still installed. */
export function resolveBrowsers(stored: StoredBrowser[], apps: Application[]): Browser[] {
  const browsers: Browser[] = [];
  for (const entry of stored) {
    const app = apps.find((a) => a.path === entry.path) ?? apps.find((a) => isSameApp(entry, a));
    if (app) browsers.push({ app, spec: finickySpec(app) });
  }
  return browsers;
}
