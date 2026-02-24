import { Color } from "@raycast/api";

export interface CVSSSeverity {
  level: "Critical" | "High" | "Medium" | "Low" | "None";
  color: Color;
  emoji: string;
}

/**
 * Get CVSS severity level based on score
 * @param cvss CVSS score (0-10)
 * @returns Severity information
 */
export function getCVSSSeverity(cvss: number | undefined): CVSSSeverity {
  if (cvss === undefined || cvss === null) {
    return {
      level: "None",
      color: Color.SecondaryText,
      emoji: "❔",
    };
  }

  if (cvss >= 9.0) {
    return {
      level: "Critical",
      color: Color.Red,
      emoji: "🔴",
    };
  }

  if (cvss >= 7.0) {
    return {
      level: "High",
      color: Color.Orange,
      emoji: "🟠",
    };
  }

  if (cvss >= 4.0) {
    return {
      level: "Medium",
      color: Color.Yellow,
      emoji: "🟡",
    };
  }

  if (cvss > 0) {
    return {
      level: "Low",
      color: Color.Blue,
      emoji: "🔵",
    };
  }

  return {
    level: "None",
    color: Color.SecondaryText,
    emoji: "⚪",
  };
}

/**
 * Format CVSS score with severity indicator
 * @param cvss CVSS score
 * @returns Formatted string
 */
export function formatCVSS(cvss: number | undefined): string {
  if (cvss === undefined || cvss === null) return "";

  const severity = getCVSSSeverity(cvss);
  return `${severity.emoji} CVSS ${cvss.toFixed(1)} (${severity.level})`;
}

/**
 * Sort vulnerabilities by CVSS score (highest first)
 * @param vulns Vulnerability object
 * @returns Sorted array of [cve, cvss] tuples
 */
export function sortVulnsByCVSS(
  vulns: Record<string, { cvss?: number }> | undefined,
): Array<[string, number | undefined]> {
  if (!vulns) return [];

  return Object.entries(vulns)
    .map(
      ([cve, details]) => [cve, details?.cvss] as [string, number | undefined],
    )
    .sort((a, b) => {
      const scoreA = a[1] ?? -1;
      const scoreB = b[1] ?? -1;
      return scoreB - scoreA; // Descending order
    });
}
