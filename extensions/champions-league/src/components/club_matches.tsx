import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAllMatches } from "../api";
import ErrorView from "./error_view";
import { Team } from "../types";
import { groupByDay, seasonLabel, teamName } from "../utils";
import MatchItem from "./match_item";

export default function ClubMatches({
  team,
  seasonYear,
}: {
  team: Team;
  seasonYear: string;
}) {
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    (season: string, teamId: string) =>
      getAllMatches({ seasonYear: season, teamId, order: "ASC", phase: "ALL" }),
    [seasonYear, team.id],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${teamName(team)} | Matches ${seasonLabel(seasonYear)}`}
    >
      {error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.Calendar} title="No matches this season" />
      )}
      {groupByDay(data).map(([day, matches]) => (
        <List.Section key={day} title={day}>
          {matches.map((match) => (
            <MatchItem key={match.id} match={match} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
