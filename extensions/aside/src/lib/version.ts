import { LATEST_TESTED_ASIDE_VERSION, MINIMUM_TESTED_ASIDE_VERSION } from "../constants";

function versionParts(version: string): number[] | undefined {
  const parts = version.split(".");
  if (!parts.length || parts.some((part) => !/^\d+$/.test(part))) return undefined;
  return parts.map(Number);
}

export function compareDottedVersions(left: string, right: string): number | undefined {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  if (!leftParts || !rightParts) return undefined;

  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function asideCompatibilityWarning(version: string): { title: string; subtitle: string } | undefined {
  const minimumComparison = compareDottedVersions(version, MINIMUM_TESTED_ASIDE_VERSION);
  const latestComparison = compareDottedVersions(version, LATEST_TESTED_ASIDE_VERSION);

  if (minimumComparison === undefined || latestComparison === undefined) {
    return {
      title: `Aside version ${version} has not been compatibility-tested`,
      subtitle: `Tested with ${MINIMUM_TESTED_ASIDE_VERSION} through ${LATEST_TESTED_ASIDE_VERSION}. Core commands remain available.`,
    };
  }
  if (minimumComparison < 0) {
    return {
      title: `Aside ${version} is older than the tested range`,
      subtitle: `Update to Aside ${MINIMUM_TESTED_ASIDE_VERSION} or later. Core commands remain available.`,
    };
  }
  if (latestComparison > 0) {
    return {
      title: `Aside ${version} has not been compatibility-tested yet`,
      subtitle: `Latest tested version: ${LATEST_TESTED_ASIDE_VERSION}. Core commands remain available.`,
    };
  }
  return undefined;
}
