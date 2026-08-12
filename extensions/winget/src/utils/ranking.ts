import { type WingetPackageDetails, type WingetSource } from "../cli/types";

type PackageRecord = {
  id: string;
  name: string;
  version: string;
  source: WingetSource;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Calculate relevance score for a package based on query match.
 * Higher score = better match.
 */
function calculateRelevanceScore(
  pkg: PackageRecord,
  lowerQuery: string,
  details?: Pick<WingetPackageDetails, "moniker" | "tags">,
): number {
  const lowerName = pkg.name.toLowerCase();
  const lowerId = pkg.id.toLowerCase();

  let score = 0;

  if (lowerName === lowerQuery) {
    score += 1000;
  } else if (lowerId === lowerQuery) {
    score += 900;
  } else if (lowerName.startsWith(lowerQuery)) {
    score += 800;
  } else if (lowerId.startsWith(lowerQuery)) {
    score += 700;
  } else if (new RegExp(`\\b${escapeRegExp(lowerQuery)}`).test(lowerName)) {
    score += 600;
  } else if (new RegExp(`\\b${escapeRegExp(lowerQuery)}`).test(lowerId)) {
    score += 500;
  } else if (lowerName.includes(lowerQuery)) {
    score += 400;
  } else if (lowerId.includes(lowerQuery)) {
    score += 300;
  }

  if (details?.moniker) {
    const lowerMoniker = details.moniker.toLowerCase();
    if (lowerMoniker === lowerQuery) {
      score += 150;
    } else if (lowerMoniker.startsWith(lowerQuery)) {
      score += 100;
    } else if (lowerMoniker.includes(lowerQuery)) {
      score += 50;
    }
  }

  if (details?.tags?.some((tag) => tag.toLowerCase() === lowerQuery)) {
    score += 75;
  } else if (details?.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
    score += 25;
  }

  if (score > 0) {
    score += Math.max(0, 50 - pkg.name.length);
  }

  return score;
}

export { calculateRelevanceScore };
