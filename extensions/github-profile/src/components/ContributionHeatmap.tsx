import { environment } from "@raycast/api";
import { ContributionDay } from "../api/github";
import { generateContributionSVG } from "../utils/contributionUtils";

interface HeatmapProps {
  weeks: Array<{
    contributionDays: ContributionDay[];
  }>;
}

export function ContributionHeatmap({ weeks }: HeatmapProps): string {
  const appearance = environment.appearance;
  // Use the SVG generator to create an embeddable image with current appearance
  const heatmapSvgUrl = generateContributionSVG(weeks, appearance);

  return `
![Contribution Heatmap](${heatmapSvgUrl})
`;
}

export function ActivityRepo(user_id: number): string {
  return `<img alt="Recent Work - Last 28 days" src="https://next.ossinsight.io/widgets/official/compose-currently-working-on/thumbnail.png?user_id=${user_id}&activity_type=all&image_size=auto&color_scheme=${environment.appearance}" width="497.5" height="auto">`;
}
