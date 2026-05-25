import * as fs from "fs";
import * as path from "path";
import { runShell } from "../shell";
import { InstalledApp, UpdateInfo } from "../types";
import { hasUpdate } from "../version";

function resolveFeedUrl(app: InstalledApp): string | null {
  if (app.sparkleFeedUrl) return app.sparkleFeedUrl;
  // DevMate fallback
  const devmate = path.join(
    app.appPath,
    "Contents/Frameworks/DevMateKit.framework",
  );
  if (fs.existsSync(devmate)) {
    return `https://updates.devmate.com/${app.bundleId}.xml`;
  }
  return null;
}

interface SparkleItem {
  version: string;
  shortVersion: string;
  releaseNotesUrl?: string;
  downloadUrl?: string;
  channel?: string;
  pubDate?: string;
}

function parseSparkleFeed(xml: string): SparkleItem[] {
  const items: SparkleItem[] = [];
  // crude but works: split by <item>
  const itemMatches = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of itemMatches) {
    const body = raw.split(/<\/item>/i)[0];

    // Sparkle feeds put version info in one of THREE places:
    //   1. Element form (most common, well-formed feeds like NothingBar):
    //        <sparkle:version>23</sparkle:version>
    //        <sparkle:shortVersionString>2.8.0</sparkle:shortVersionString>
    //   2. Attribute form on enclosure (older feeds, Dia, etc):
    //        <enclosure ... sparkle:version="23" sparkle:shortVersionString="2.8.0" .../>
    //   3. Loose attribute form anywhere (rarer):
    //        ... sparkle:version="23" ...
    // We try element form first (most reliable) and fall back to attribute forms.

    const verElement = body.match(
      /<sparkle:version[^>]*>\s*([^<\s][^<]*?)\s*<\/sparkle:version>/i,
    )?.[1];
    const shortVerElement = body.match(
      /<sparkle:shortVersionString[^>]*>\s*([^<\s][^<]*?)\s*<\/sparkle:shortVersionString>/i,
    )?.[1];
    const verAttr = body.match(
      /(?<!short)sparkle:version=["']([^"']+)["']/i,
    )?.[1];
    const shortVerAttr = body.match(
      /sparkle:shortVersionString=["']([^"']+)["']/i,
    )?.[1];

    const ver = verElement?.trim() ?? verAttr;
    let shortVer = shortVerElement?.trim() ?? shortVerAttr;

    // Some feeds (e.g., Dia) embed the build number in the short version:
    // shortVersion="1.32.0 (81144)" version="81144" → strip the redundant "(81144)"
    if (shortVer && ver) {
      const m = shortVer.match(/^(.+?)\s*\((\d[\w.]*)\)\s*$/);
      if (m && m[2] === ver) shortVer = m[1].trim();
    }

    // Channel can be element or attribute form
    const channel =
      body.match(
        /<sparkle:channel[^>]*>\s*([^<\s][^<]*?)\s*<\/sparkle:channel>/i,
      )?.[1] ?? body.match(/sparkle:channel=["']([^"']+)["']/i)?.[1];

    const releaseNotesUrl =
      body.match(
        /<sparkle:releaseNotesLink[^>]*>\s*([^<\s]+)\s*<\/sparkle:releaseNotesLink>/i,
      )?.[1] ||
      body.match(
        /<sparkle:fullReleaseNotesLink[^>]*>\s*([^<\s]+)\s*<\/sparkle:fullReleaseNotesLink>/i,
      )?.[1];
    const enclosureUrl = body.match(
      /<enclosure[^>]*url=["']([^"']+)["']/i,
    )?.[1];
    const pubDate = body.match(/<pubDate>\s*([^<]+)\s*<\/pubDate>/i)?.[1];

    const itemVersion = ver || "";
    const itemShort = shortVer || itemVersion;

    if (!itemVersion && !itemShort) continue;
    items.push({
      version: itemVersion,
      shortVersion: itemShort,
      releaseNotesUrl,
      downloadUrl: enclosureUrl,
      channel: channel?.trim(),
      pubDate: pubDate?.trim(),
    });
  }
  return items;
}

export async function checkSparkle(
  app: InstalledApp,
): Promise<UpdateInfo | null> {
  const feedUrl = resolveFeedUrl(app);
  if (!feedUrl) return null;

  try {
    const { stdout } = await runShell(
      `/usr/bin/curl -sL --max-time 10 -A "Mac Updater/1.0" "${feedUrl}" 2>/dev/null`,
    );
    if (!stdout || stdout.length < 20) return null;

    const items = parseSparkleFeed(stdout);
    // Filter to default channel only (no channel tag = stable)
    const stable = items.filter(
      (i) => !i.channel || i.channel === "release" || i.channel === "stable",
    );
    const pool = stable.length > 0 ? stable : items;
    if (pool.length === 0) return null;

    // Pick the highest version. hasUpdate(a, b) returns true iff b > a.
    let latest = pool[0];
    for (let i = 1; i < pool.length; i++) {
      if (
        hasUpdate(
          latest.shortVersion,
          latest.version,
          pool[i].shortVersion,
          pool[i].version,
        )
      ) {
        latest = pool[i];
      }
    }
    const latestShort = latest.shortVersion || latest.version;

    return {
      app,
      source: "sparkle",
      latestVersion: latestShort,
      latestBuild: latest.version,
      hasUpdate: hasUpdate(
        app.version,
        app.buildNumber,
        latestShort,
        latest.version,
      ),
      releaseNotesUrl: latest.releaseNotesUrl,
      downloadUrl: latest.downloadUrl,
      checkedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function openAppForSparkleUpdate(appPath: string): Promise<void> {
  // Triggers the app to run, where Sparkle auto-checks on launch for most apps
  await runShell(`open "${appPath}"`);
}
