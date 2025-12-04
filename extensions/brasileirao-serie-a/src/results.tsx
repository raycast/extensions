import { Icon, List } from "@raycast/api";
import { format } from "date-fns";
import { TeamsSelector } from "./components";
import { useMatches, useSelectedTeam } from "./hooks";
import { getTeamShortName } from "./hooks/useTeams";
import { groupBy } from "./utils";

export default function Results() {
  const [teamId, setTeamId] = useSelectedTeam();
  const [data, isLoading] = useMatches({ status: ["FINISHED"], teamId });

  const dates = groupBy(
    data.sort((a, b) => b.utcDate.localeCompare(a.utcDate)),
    (match) => format(new Date(match.utcDate), "EEE d MMM yyyy"),
  );

  return (
    <List throttle isLoading={isLoading} searchBarAccessory={<TeamsSelector value={teamId} onChange={setTeamId} />}>
      {Object.entries(dates).map(([label, matches]) => {
        return (
          <List.Section key={label} title={label}>
            {matches.map((match) => {
              const time = format(new Date(match.utcDate), "HH:mm");

              return (
                <List.Item
                  key={match.id}
                  title={time}
                  subtitle={`${getTeamShortName(match.homeTeam)} ${match.score.fullTime.home} - ${
                    match.score.fullTime.away
                  } ${getTeamShortName(match.awayTeam)}`}
                  icon={Icon.Clock}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
