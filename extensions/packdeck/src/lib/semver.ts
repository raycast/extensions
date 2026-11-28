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
  const stripped = trimmed
    .replace(/^(workspace:|npm:|catalog:)/i, "")
    .replace(/^[\^~>=<=\s]+/, "")
    .replace(/^v/i, "");

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
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    return partA > partB ? 1 : -1;
  }
  return 0;
}

export function compareParsed(a: ParsedSemver, b: ParsedSemver): number {
  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
  return comparePrerelease(a.prerelease, b.prerelease);
}

export function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) {
    return a.localeCompare(b);
  }
  return compareParsed(parsedA, parsedB);
}

export function isOutdated(current: string, target: string): boolean {
  const parsedCurrent = parseSemver(current);
  const parsedTarget = parseSemver(target);
  if (!parsedCurrent || !parsedTarget) {
    return current.trim() !== target.trim();
  }
  return compareParsed(parsedTarget, parsedCurrent) > 0;
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

interface PartialVersion {
  major?: number;
  minor?: number;
  patch?: number;
  prerelease: string[];
}

function parsePartialVersion(raw: string): PartialVersion | null {
  const cleaned = raw.trim().replace(/^v/i, "");
  if (!cleaned || cleaned === "*" || cleaned.toLowerCase() === "x") {
    return { prerelease: [] };
  }
  const match = cleaned.match(/^(\d+|x|X|\*)(?:\.(\d+|x|X|\*))?(?:\.(\d+|x|X|\*))?(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/);
  if (!match) return null;

  const isWild = (tok: string | undefined) => !tok || tok === "*" || tok.toLowerCase() === "x";
  return {
    major: isWild(match[1]) ? undefined : Number.parseInt(match[1], 10),
    minor: isWild(match[2]) ? undefined : Number.parseInt(match[2], 10),
    patch: isWild(match[3]) ? undefined : Number.parseInt(match[3], 10),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function makeSemver(major: number, minor = 0, patch = 0, prerelease: string[] = []): ParsedSemver {
  const pre = prerelease.length > 0 ? `-${prerelease.join(".")}` : "";
  return { major, minor, patch, prerelease, raw: `${major}.${minor}.${patch}${pre}` };
}

function matchesSingleComparator(candidate: ParsedSemver, token: string): boolean | null {
  const t = token.trim();
  if (!t || t === "*" || t.toLowerCase() === "x" || t === "latest") return true;

  // Caret range: ^1.2.3, ^0.2.3, ^0.0.3, ^1.2, ^1
  if (t.startsWith("^")) {
    const p = parsePartialVersion(t.slice(1));
    if (!p || p.major === undefined) return null;
    const lower = makeSemver(p.major, p.minor ?? 0, p.patch ?? 0, p.prerelease);
    if (compareParsed(candidate, lower) < 0) return false;
    let upper: ParsedSemver;
    if (p.major > 0) {
      upper = makeSemver(p.major + 1, 0, 0);
    } else if (p.minor !== undefined && p.minor > 0) {
      upper = makeSemver(0, p.minor + 1, 0);
    } else if (p.minor === undefined) {
      upper = makeSemver(1, 0, 0);
    } else if (p.patch !== undefined) {
      upper = makeSemver(0, 0, p.patch + 1);
    } else {
      upper = makeSemver(0, 1, 0);
    }
    return compareParsed(candidate, upper) < 0;
  }

  // Tilde range: ~1.2.3, ~1.2, ~1
  if (t.startsWith("~")) {
    const p = parsePartialVersion(t.slice(1));
    if (!p || p.major === undefined) return null;
    const lower = makeSemver(p.major, p.minor ?? 0, p.patch ?? 0, p.prerelease);
    if (compareParsed(candidate, lower) < 0) return false;
    const upper = p.minor !== undefined ? makeSemver(p.major, p.minor + 1, 0) : makeSemver(p.major + 1, 0, 0);
    return compareParsed(candidate, upper) < 0;
  }

  // Relational operators: >=, <=, >, <, =
  const relMatch = t.match(/^(>=|<=|>|<|=)(.+)$/);
  if (relMatch) {
    const op = relMatch[1];
    const p = parsePartialVersion(relMatch[2]);
    if (!p) return null;
    if (p.major === undefined) return true;
    const lower = makeSemver(p.major, p.minor ?? 0, p.patch ?? 0, p.prerelease);
    if (op === ">=") return compareParsed(candidate, lower) >= 0;
    if (op === ">") {
      if (p.minor === undefined) return compareParsed(candidate, makeSemver(p.major + 1, 0, 0)) >= 0;
      if (p.patch === undefined) return compareParsed(candidate, makeSemver(p.major, p.minor + 1, 0)) >= 0;
      return compareParsed(candidate, lower) > 0;
    }
    if (op === "<") return compareParsed(candidate, lower) < 0;
    if (op === "<=") {
      if (p.minor === undefined) return compareParsed(candidate, makeSemver(p.major + 1, 0, 0)) < 0;
      if (p.patch === undefined) return compareParsed(candidate, makeSemver(p.major, p.minor + 1, 0)) < 0;
      return compareParsed(candidate, lower) <= 0;
    }
    if (op === "=") {
      if (p.minor === undefined) return candidate.major === p.major;
      if (p.patch === undefined) return candidate.major === p.major && candidate.minor === p.minor;
      return compareParsed(candidate, lower) === 0;
    }
  }

  // Bare version or x-range (e.g. "1.2.3", "1.2.x", "1.x", "1")
  const p = parsePartialVersion(t);
  if (!p) return null;
  if (p.major === undefined) return true;
  if (p.minor === undefined) return candidate.major === p.major;
  if (p.patch === undefined) return candidate.major === p.major && candidate.minor === p.minor;
  return compareParsed(candidate, makeSemver(p.major, p.minor, p.patch, p.prerelease)) === 0;
}

function matchesBranch(candidate: ParsedSemver, branch: string): boolean | null {
  const trimmed = branch.trim();
  if (!trimmed) return true;

  // Hyphen range: "1.2.3 - 2.3.4"
  const hyphenMatch = trimmed.match(/^([^\s]+)\s+-\s+([^\s]+)$/);
  if (hyphenMatch) {
    const lowOk = matchesSingleComparator(candidate, `>=${hyphenMatch[1]}`);
    const highOk = matchesSingleComparator(candidate, `<=${hyphenMatch[2]}`);
    if (lowOk === null || highOk === null) return null;
    return lowOk && highOk;
  }

  // Normalize spaces after operators like ">= 1.0.0 < 2.0.0" -> ">=1.0.0 <2.0.0"
  const normalized = trimmed.replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  for (const token of tokens) {
    const result = matchesSingleComparator(candidate, token);
    if (result === null) return null;
    if (!result) return false;
  }
  return true;
}

/**
 * Evaluates whether a semver version satisfies a standard npm semver range expression,
 * supporting `||` unions, space-separated intersections, hyphen ranges, `^`, `~`, `x`-ranges, and comparators.
 * Returns `null` if the range syntax cannot be recognized.
 */
export function satisfiesSemverRange(version: string, range: string): boolean | null {
  const candidate = parseSemver(version);
  if (!candidate) return null;

  const trimmed = range.trim();
  if (!trimmed || trimmed === "*" || trimmed === "latest" || trimmed === "workspace:*") {
    return true;
  }

  const branches = trimmed.split("||");
  let sawValidBranch = false;
  for (const branch of branches) {
    const res = matchesBranch(candidate, branch);
    if (res === true) return true;
    if (res === false) sawValidBranch = true;
  }
  return sawValidBranch ? false : null;
}

/**
 * Given a package.json range (e.g. "^1.2.3", ">=1.0.0 <2.0.0", "^1.0.0 || ^2.0.0")
 * and a list of published versions, finds the highest stable version satisfying the range.
 * Falls back to `fallbackVersion` (typically the currently installed version) when a range is unrecognized
 * or no published stable version satisfies it, never falsely claiming an out-of-range `latest` is wanted.
 */
export function findWantedVersion(
  declaredRange: string,
  availableVersions: string[],
  latestVersion: string,
  fallbackVersion?: string,
): string {
  const trimmed = declaredRange.trim();
  if (!trimmed || trimmed === "*" || trimmed === "latest" || trimmed === "workspace:*") {
    return latestVersion;
  }

  const stableVersions = availableVersions
    .map((v) => parseSemver(v))
    .filter((v): v is ParsedSemver => v !== null && v.prerelease.length === 0)
    .sort((a, b) => compareParsed(b, a));

  if (stableVersions.length === 0) {
    return fallbackVersion ?? cleanVersion(trimmed);
  }

  for (const candidate of stableVersions) {
    const satisfied = satisfiesSemverRange(candidate.raw, trimmed);
    if (satisfied === true) {
      return candidate.raw;
    }
    if (satisfied === null) {
      // Unrecognized range syntax — do not falsely advertise latestVersion as wanted
      return fallbackVersion ?? cleanVersion(trimmed);
    }
  }

  return fallbackVersion ?? cleanVersion(trimmed);
}
