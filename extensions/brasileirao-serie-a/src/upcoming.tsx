import { Icon, List } from "@raycast/api";
import { format } from "date-fns";
import { TeamsSelector } from "./components";
import { useMatches, useSelectedTeam } from "./hooks";
import { groupBy } from "./utils";

export default function Upcoming() {
  const [teamId, setTeamId] = useSelectedTeam();
  const [data, isLoading] = useMatches({ status: ["SCHEDULED", "TIMED", "IN_PLAY", "PAUSED"], teamId });

  const dates = groupBy(data, (match) => format(new Date(match.utcDate), "EEE d MMM yyyy"));

  return (
    <List throttle isLoading={isLoading} searchBarAccessory={<TeamsSelector value={teamId} onChange={setTeamId} />}>
      {Object.entries(dates).map(([label, matches]) => {
        return (
          <List.Section key={label} title={label}>
            {matches.map((match) => {
              const time = format(new Date(match.utcDate), "HH:mm");
              const isLive = ["IN_PLAY", "PAUSED"].includes(match.status);

              return (
                <List.Item
                  key={match.id}
                  title={time}
                  subtitle={
                    isLive
                      ? `${match.homeTeam.shortName} ${match.score.fullTime.home} - ${match.score.fullTime.away} ${match.awayTeam.shortName}`
                      : `${match.homeTeam.shortName} - ${match.awayTeam.shortName}`
                  }
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
