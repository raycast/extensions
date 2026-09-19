import { GroundcrewClientError } from "./errors";

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

interface ParsedSemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
  raw: string;
}

function parseSemVer(raw: string, errorMessage: string): ParsedSemVer {
  const version = raw.trim();
  const match = SEMVER_PATTERN.exec(version);
  if (match === null) {
    throw new GroundcrewClientError("MALFORMED_VERSION", errorMessage);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split(".") ?? [],
    raw: version,
  };
}

function comparePrerelease(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0 || right.length === 0) {
    return left.length === right.length ? 0 : left.length === 0 ? 1 : -1;
  }
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left[index];
    const rightIdentifier = right[index];
    if (leftIdentifier === undefined || rightIdentifier === undefined) {
      return leftIdentifier === rightIdentifier ? 0 : leftIdentifier === undefined ? -1 : 1;
    }
    if (leftIdentifier === rightIdentifier) {
      continue;
    }
    const leftNumeric = /^\d+$/.test(leftIdentifier);
    const rightNumeric = /^\d+$/.test(rightIdentifier);
    if (leftNumeric && rightNumeric) {
      return Number(leftIdentifier) - Number(rightIdentifier);
    }
    if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1;
    }
    return leftIdentifier.localeCompare(rightIdentifier);
  }
  return 0;
}

function compareSemVer(left: ParsedSemVer, right: ParsedSemVer): number {
  for (const key of ["major", "minor", "patch"] as const) {
    const difference = left[key] - right[key];
    if (difference !== 0) {
      return difference;
    }
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

export function assertCompatibleVersion(output: string, minimumVersion: string): string {
  const installed = parseSemVer(
    output,
    `Groundcrew returned an invalid SemVer from crew --version: ${JSON.stringify(output.trim())}`,
  );
  const minimum = parseSemVer(minimumVersion, `The extension minimum version is invalid: ${minimumVersion}`);
  if (compareSemVer(installed, minimum) < 0) {
    throw new GroundcrewClientError(
      "INCOMPATIBLE_VERSION",
      `Groundcrew ${installed.raw} is installed, but this extension requires ${minimum.raw} or newer. Upgrade Groundcrew and try again.`,
    );
  }
  return installed.raw;
}
