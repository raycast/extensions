import { XMLParser } from "fast-xml-parser";
import {
  ChocoPackage,
  ChocoSource,
  InstalledPackage,
  OutdatedPackage,
} from "./types";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
});

function asString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record["@_null"] === "true") {
      return undefined;
    }
    if ("#text" in record) {
      return asString(record["#text"]);
    }
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  const str = asString(value);
  if (!str) {
    return undefined;
  }
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  const str = asString(value);
  if (!str) {
    return undefined;
  }
  if (str.toLowerCase() === "true") {
    return true;
  }
  if (str.toLowerCase() === "false") {
    return false;
  }
  return undefined;
}

function splitNonEmptyLines(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Parses pipe-delimited `id|version` lines from `choco list -r`,
 * `choco pin list -r`, or `choco search -r`.
 */
export function parseLimitOutputPairs(
  stdout: string,
): Array<{ id: string; version: string }> {
  const results: Array<{ id: string; version: string }> = [];
  for (const line of splitNonEmptyLines(stdout)) {
    const parts = line.split("|");
    if (parts.length < 2) {
      continue;
    }
    const id = parts[0].trim();
    const version = parts[1].trim();
    if (!id || !version || id.includes(" ")) {
      continue;
    }
    results.push({ id, version });
  }
  return results;
}

/**
 * Combines installed package pairs with pinned package IDs.
 */
export function mergeInstalledAndPinned(
  installedPairs: Array<{ id: string; version: string }>,
  pinnedPairs: Array<{ id: string; version: string }>,
): InstalledPackage[] {
  const pinnedIds = new Set(pinnedPairs.map((item) => item.id.toLowerCase()));
  return installedPairs.map((item) => ({
    id: item.id,
    version: item.version,
    pinned: pinnedIds.has(item.id.toLowerCase()),
  }));
}

/**
 * Parses `choco outdated -r` output (`id|current|available|pinned`).
 */
export function parseOutdatedOutput(stdout: string): OutdatedPackage[] {
  const results: OutdatedPackage[] = [];
  for (const line of splitNonEmptyLines(stdout)) {
    const parts = line.split("|");
    if (parts.length < 4) {
      continue;
    }
    const id = parts[0].trim();
    const currentVersion = parts[1].trim();
    const availableVersion = parts[2].trim();
    const pinned = parts[3].trim().toLowerCase() === "true";
    if (!id || !currentVersion || !availableVersion) {
      continue;
    }
    results.push({
      id,
      currentVersion,
      availableVersion,
      pinned,
    });
  }
  return results;
}

/**
 * Parses `choco source list -r` output:
 * `name|url|disabled|user|cert|priority|bypassProxy|allowSelfService|adminOnly`
 */
export function parseSourcesOutput(stdout: string): ChocoSource[] {
  const results: ChocoSource[] = [];
  for (const line of splitNonEmptyLines(stdout)) {
    const parts = line.split("|");
    if (parts.length < 3) {
      continue;
    }
    const name = parts[0].trim();
    const url = parts[1].trim();
    if (!name || !url) {
      continue;
    }
    const priority = Number.parseInt(parts[5]?.trim() ?? "0", 10);
    results.push({
      name,
      url,
      disabled: parts[2]?.trim().toLowerCase() === "true",
      username: parts[3]?.trim() || undefined,
      certificate: parts[4]?.trim() || undefined,
      priority: Number.isFinite(priority) ? priority : 0,
      bypassProxy: parts[6]?.trim().toLowerCase() === "true",
      allowSelfService: parts[7]?.trim().toLowerCase() === "true",
      adminOnly: parts[8]?.trim().toLowerCase() === "true",
    });
  }
  return results;
}

/**
 * Parses Chocolatey NuGet dependency strings like `git.install:[2.56.1]:|kb2919355:1.0.13700:`.
 */
export function parseDependencies(raw?: string): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [id, versionRange] = entry.split(":");
      const cleanId = id?.trim();
      const cleanVersion = versionRange?.trim();
      if (!cleanId) {
        return "";
      }
      return cleanVersion ? `${cleanId} (${cleanVersion})` : cleanId;
    })
    .filter((entry) => entry.length > 0);
}

/**
 * Parses Chocolatey OData v2 Atom XML feed into structured package objects.
 */
export function parseODataFeed(xml: string): ChocoPackage[] {
  if (!xml.trim()) {
    return [];
  }
  const parsed = xmlParser.parse(xml) as {
    feed?: { entry?: Record<string, unknown> | Array<Record<string, unknown>> };
    entry?: Record<string, unknown>;
  };

  const rawEntries = parsed.feed?.entry ?? parsed.entry;
  if (!rawEntries) {
    return [];
  }
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  const packages: ChocoPackage[] = [];
  for (const entry of entries) {
    const props =
      (entry.properties as Record<string, unknown> | undefined) ?? {};
    const id = asString(entry.title) ?? asString(props.Id);
    const version = asString(props.Version);
    if (!id || !version) {
      continue;
    }

    const tagsRaw = asString(props.Tags);
    const tags = tagsRaw ? tagsRaw.split(/\s+/).filter(Boolean) : undefined;
    const dependenciesRaw = asString(props.Dependencies);
    const dependencies = parseDependencies(dependenciesRaw);

    packages.push({
      id,
      title: asString(props.Title) ?? id,
      version,
      summary: asString(entry.summary),
      description: asString(props.Description),
      authors:
        asString((entry.author as Record<string, unknown> | undefined)?.name) ??
        asString(props.Authors),
      projectUrl: asString(props.ProjectUrl),
      packageUrl:
        asString(props.GalleryDetailsUrl) ??
        `https://community.chocolatey.org/packages/${encodeURIComponent(id)}`,
      licenseUrl: asString(props.LicenseUrl),
      iconUrl: asString(props.IconUrl),
      tags,
      dependencies: dependencies.length > 0 ? dependencies : undefined,
      downloadCount: asNumber(props.DownloadCount),
      versionDownloadCount: asNumber(props.VersionDownloadCount),
      published: asString(props.Published) ?? asString(entry.updated),
      isPrerelease: asBoolean(props.IsPrerelease),
      packageHash: asString(props.PackageHash),
    });
  }

  return packages;
}

function escapeXmlAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("'", "&apos;");
}

/**
 * Generates a Chocolatey `packages.config` XML manifest from installed packages.
 */
export function generatePackagesConfigXml(
  packages: InstalledPackage[],
  includeVersions: boolean,
): string {
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', "<packages>"];
  for (const pkg of packages) {
    const idAttr = `id="${escapeXmlAttr(pkg.id)}"`;
    const versionAttr = includeVersions
      ? ` version="${escapeXmlAttr(pkg.version)}"`
      : "";
    lines.push(`  <package ${idAttr}${versionAttr} />`);
  }
  lines.push("</packages>");
  return `${lines.join("\n")}\n`;
}
