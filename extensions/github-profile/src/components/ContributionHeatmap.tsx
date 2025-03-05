import { ContributionDay } from "../api/github";
import { generateContributionSVG } from "../utils/contributionUtils";

interface HeatmapProps {
  weeks: Array<{
    contributionDays: ContributionDay[];
  }>;
}

export function ContributionHeatmap({ weeks }: HeatmapProps): string {
  // Use the SVG generator to create an embeddable image
  const heatmapSvgUrl = generateContributionSVG(weeks);

  return `
![Contribution Heatmap](${heatmapSvgUrl})
`;
}
