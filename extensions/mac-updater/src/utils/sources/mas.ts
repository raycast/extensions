import * as fs from "fs";
import { commandExists, extractCmdError, findBrew, run } from "../shell";
import { InstalledApp, UpdateInfo, UpdateResult } from "../types";
import { hasUpdate } from "../version";

// mas's binary path mirrors brew's prefix.
const MAS_CANDIDATES = ["/opt/homebrew/bin/mas", "/usr/local/bin/mas"];

export function findMas(): string | null {
  for (const p of MAS_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function isMasInstalled(): Promise<boolean> {
  // findMas is a synchronous filesystem check, but we also fall back to
  // commandExists in case mas is on the PATH via some other mechanism.
  if (findMas()) return true;
  return commandExists("mas");
}

export async function installMas(): Promise<UpdateResult> {
  const brew = findBrew();
  if (!brew) {
    return {
      name: "mas",
      source: "mas",
      success: false,
      error: "Homebrew is not installed. Visit brew.sh to install it first.",
    };
  }
  try {
    await run(brew, ["install", "mas"]);
    return { name: "mas", source: "mas", success: true };
  } catch (e) {
    return {
      name: "mas",
      source: "mas",
      success: false,
      error: extractCmdError(e),
    };
  }
}

interface ITunesResult {
  trackId: number;
  version: string;
  releaseNotes?: string;
  trackViewUrl?: string;
  minimumOsVersion?: string;
  currentVersionReleaseDate?: string;
}

async function itunesLookup(
  bundleId: string,
  entity: "desktopSoftware" | "macSoftware",
): Promise<ITunesResult | null> {
  const country = "us";
  const url = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&country=${country}&entity=${entity}&limit=1`;
  try {
    // execFile via run() — bundleId comes from a plist we don't control, so
    // even with encodeURIComponent we route the URL as a separate argv slot
    // rather than interpolating it into a shell command.
    const { stdout } = await run("/usr/bin/curl", [
      "-sL",
      "--max-time",
      "12",
      url,
    ]);
    const data = JSON.parse(stdout);
    if (data.resultCount > 0) return data.results[0];
    return null;
  } catch {
    return null;
  }
}

export async function checkAppStore(
  app: InstalledApp,
): Promise<UpdateInfo | null> {
  if (!app.hasAppStoreReceipt) return null;
  const result =
    (await itunesLookup(app.bundleId, "desktopSoftware")) ??
    (await itunesLookup(app.bundleId, "macSoftware"));
  if (!result) return null;
  const released = result.currentVersionReleaseDate
    ? Date.parse(result.currentVersionReleaseDate)
    : NaN;
  return {
    app,
    source: "mas",
    latestVersion: result.version,
    hasUpdate: hasUpdate(app.version, app.buildNumber, result.version),
    masId: result.trackId,
    // iTunes "What's New" is plain text, not HTML — keep it as text so it's
    // rendered with its line breaks intact, not mangled by the HTML converter.
    releaseNotesText: result.releaseNotes,
    releasedAt: Number.isNaN(released) ? undefined : released,
    releaseNotesUrl: result.trackViewUrl,
    downloadUrl: result.trackViewUrl,
    checkedAt: Date.now(),
  };
}

async function ensureMas(): Promise<UpdateResult | null> {
  if (await isMasInstalled()) return null;
  const r = await installMas();
  if (!r.success) return r;
  return null;
}

export async function upgradeMas(
  masId: number,
  name: string,
): Promise<UpdateResult> {
  const installFail = await ensureMas();
  if (installFail) return { ...installFail, name };
  try {
    const mas = findMas() ?? "mas";
    await run(mas, ["upgrade", String(masId)]);
    return { name, source: "mas", success: true };
  } catch (e) {
    return { name, source: "mas", success: false, error: extractCmdError(e) };
  }
}

export async function upgradeAllMas(): Promise<UpdateResult> {
  const installFail = await ensureMas();
  if (installFail) return { ...installFail, name: "App Store (all)" };
  try {
    const mas = findMas() ?? "mas";
    await run(mas, ["upgrade"]);
    return { name: "App Store (all)", source: "mas", success: true };
  } catch (e) {
    return {
      name: "App Store (all)",
      source: "mas",
      success: false,
      error: extractCmdError(e),
    };
  }
}
