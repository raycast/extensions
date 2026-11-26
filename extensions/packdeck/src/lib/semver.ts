import { SemverBump } from "../types";

export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
  raw: string;
}

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function cleanVersion(input: string): string {
  const trimmed = input.trim();
  // Strip common semver range prefixes and leading 'v'
  const stripped = trimmed
    .replace(/^(workspace:|npm:|catalog:)/i, "")
    .replace(/^[\^~>=<=\s]+/, "")
    .replace(/^v/i, "");

  // If it's a compound range like ">=1.2.3 <2.0.0", take the first semver-like token
  const firstToken = stripped.split(/\s+/)[0] ?? stripped;
  const match = firstToken.match(/(\d+)\.(\d+)(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?/);
  if (!match) {
    return trimmed;
  }
  const major = match[1];
  const minor = match[2];
  const patch = match[3] ?? "0";
  const pre = match[4] ? `-${match[4]}` : "";
  return `${major}.${minor}.${patch}${pre}`;
}

export function parseSemver(input: string): ParsedSemver | null {
  const cleaned = cleanVersion(input);
  const match = cleaned.match(SEMVER_REGEX);
  if (!match) {
    return null;
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4] ? match[4].split(".") : [],
    raw: cleaned,
  };
}

function comparePrerelease(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1; // stable > prerelease
  if (b.length === 0) return -1;

  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (i >= a.length) return -1;
    if (i >= b.length) return 1;
    const partA = a[i];
    const partB = b[i];
    if (partA === partB) continue;

    const numA = /^\d+$/.test(partA) ? Number.parseInt(partA, 10) : null;
    const numB = /^\d+$/.test(partB) ? Number.parseInt(partB, 10) : null;

    if (numA !== null && numB !== null) {
      return numA > numB ? 1 : -1;
    }
    if (numA !== null) return -1; // numeric < non-numeric per semver spec
    if (numB !== null) return 1;
    return partA > partB ? 1 : -1;
  }
  return 0;
}

export function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) {
    return a.localeCompare(b);
  }
  if (parsedA.major !== parsedB.major) return parsedA.major > parsedB.major ? 1 : -1;
  if (parsedA.minor !== parsedB.minor) return parsedA.minor > parsedB.minor ? 1 : -1;
  if (parsedA.patch !== parsedB.patch) return parsedA.patch > parsedB.patch ? 1 : -1;
  return comparePrerelease(parsedA.prerelease, parsedB.prerelease);
}

export function isOutdated(current: string, target: string): boolean {
  const parsedCurrent = parseSemver(current);
  const parsedTarget = parseSemver(target);
  if (!parsedCurrent || !parsedTarget) {
    return current.trim() !== target.trim();
  }
  return compareSemver(parsedTarget.raw, parsedCurrent.raw) > 0;
}

export function classifyBump(current: string, target: string): SemverBump {
  const parsedCurrent = parseSemver(current);
  const parsedTarget = parseSemver(target);
  if (!parsedCurrent || !parsedTarget) {
    return "unknown";
  }
  if (parsedTarget.prerelease.length > 0 && parsedTarget.major === parsedCurrent.major) {
    return "prerelease";
  }
  if (parsedTarget.major > parsedCurrent.major) {
    return "major";
  }
  if (parsedTarget.minor > parsedCurrent.minor) {
    return "minor";
  }
  if (parsedTarget.patch > parsedCurrent.patch) {
    return "patch";
  }
  if (parsedTarget.prerelease.length > 0 || parsedCurrent.prerelease.length > 0) {
    return "prerelease";
  }
  return "unknown";
}

/**
 * Given a package.json range (e.g. "^1.2.3", "~1.2.3", "1.2.3", ">=1.0.0", "*")
 * and a list of published versions, finds the highest stable version satisfying the range.
 */
export function findWantedVersion(declaredRange: string, availableVersions: string[], latestVersion: string): string {
  const trimmed = declaredRange.trim();
  if (!trimmed || trimmed === "*" || trimmed === "latest" || trimmed === "workspace:*") {
    return latestVersion;
  }

  const stableVersions = availableVersions
    .map((v) => parseSemver(v))
    .filter((v): v is ParsedSemver => v !== null && v.prerelease.length === 0)
    .sort((a, b) => compareSemver(b.raw, a.raw));

  if (stableVersions.length === 0) {
    return latestVersion;
  }

  // Caret range: ^major.minor.patch
  if (trimmed.startsWith("^")) {
    const base = parseSemver(trimmed.slice(1));
    if (!base) return latestVersion;
    const match = stableVersions.find((v) => {
      if (compareSemver(v.raw, base.raw) < 0) return false;
      if (base.major > 0) return v.major === base.major;
      if (base.minor > 0) return v.major === 0 && v.minor === base.minor;
      return v.major === 0 && v.minor === 0 && v.patch === base.patch;
    });
    return match?.raw ?? base.raw;
  }

  // Tilde range: ~major.minor.patch
  if (trimmed.startsWith("~")) {
    const base = parseSemver(trimmed.slice(1));
    if (!base) return latestVersion;
    const match = stableVersions.find(
      (v) => compareSemver(v.raw, base.raw) >= 0 && v.major === base.major && v.minor === base.minor,
    );
    return match?.raw ?? base.raw;
  }

  // Exact pin
  const exact = parseSemver(trimmed);
  if (exact && !/[<>x*|\s]/.test(trimmed)) {
    return exact.raw;
  }

  // >= range without upper bound
  if (trimmed.startsWith(">=") && !trimmed.includes("<")) {
    return latestVersion;
  }

  return latestVersion;
}
