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

export function timeContributionHeatmap(username: string, user_id: number): string {
  return `<img alt="When Do Participants Prefer to Submit Code?" src="https://next.ossinsight.io/widgets/official/analyze-org-commits-time-distribution/thumbnail.png?owner_id=${user_id}&period=past_90_days&zone=0&image_size=3x6&color_scheme=light" width="561" height="auto">`;
}

export function ActivityRepo(user_id: number): string {
  return `<img alt="@634750802's Recent Work - Last 28 days" src="https://next.ossinsight.io/widgets/official/compose-currently-working-on/thumbnail.png?user_id=${user_id}&activity_type=all&image_size=auto&color_scheme=light" width="497.5" height="auto">`;
}
