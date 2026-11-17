import { environment } from "@raycast/api";
import { ContributionDay } from "../api/github";
import { generateContributionSVG } from "../utils/contributionUtils";

interface HeatmapProps {
  weeks: Array<{
    contributionDays: ContributionDay[];
  }>;
  totalContributions?: number;
}

export function ContributionHeatmap({ weeks, totalContributions }: HeatmapProps): string {
  if (weeks.length === 0) {
    return "The contribution calendar is currently unavailable.";
  }

  const appearance = environment.appearance;
  // Use the SVG generator to create an embeddable image with current appearance
  const heatmapSvgUrl = generateContributionSVG(weeks, appearance, totalContributions);

  return `
<img alt="Contribution Heatmap" src="${heatmapSvgUrl}" width="650" />
`;
}
