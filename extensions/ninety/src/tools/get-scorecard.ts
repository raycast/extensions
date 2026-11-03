import { getTeamScorecard } from "../api/ninety";
import { formatGoal, formatKpiValue } from "../lib/format";
import { NinetyUrls } from "../lib/urls";

type Input = {
  /** Team Id from get-teams. */
  teamId: string;
  /** Which Scorecard to read. Defaults to weekly. */
  interval?: "weekly" | "monthly" | "quarterly" | "annual";
};

export default async function tool({ teamId, interval = "weekly" }: Input) {
  const scorecard = await getTeamScorecard(teamId, interval);
  return {
    name: scorecard.name,
    interval: scorecard.periodInterval,
    groups: scorecard.groups.map((group) => ({
      name: group.name,
      measurables: group.kpis.map((kpi) => ({
        id: kpi.id,
        title: kpi.title,
        owner: kpi.ownerName,
        url: NinetyUrls.kpi(interval, group.id, kpi.id, teamId),
        goal: formatGoal(kpi.defaultGoal, kpi.unit),
        scores: kpi.scores
          .filter((score) => !score.isFuture)
          .map((score) => ({
            period: score.label,
            value: formatKpiValue(score.value, kpi.unit),
            goal: formatGoal(score.goal ?? kpi.defaultGoal, kpi.unit),
          })),
      })),
    })),
  };
}
