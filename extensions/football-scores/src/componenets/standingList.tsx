import { Action, ActionPanel, List } from "@raycast/api";
import { Standing } from "../types/league-standings";
import UpcomingTeamMatches from "./upcomingTeamMatches";

export default function StandingList({ standing }: { standing: Standing }) {
  if (standing.table.length === 0) {
    return <List.Item title="No standings available" />;
  }

  return (
    <List.Section title={standing.group}>
      {standing.table.map((position) => (
        <List.Item
          key={position.team.id}
          title={`${position.position.toString()}. ${position.team.shortName}`}
          icon={position.team.crest}
          accessories={[
            { text: position.points.toString(), icon: "🏆", tooltip: "Points" },
            { text: `${position.won}W ${position.draw}D ${position.lost}L`, icon: "🏟", tooltip: "W-D-L" },
            { text: `${position.goalsFor} - ${position.goalsAgainst}`, icon: "⚽️", tooltip: "Goals" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Upcoming Matches ⚽"
                target={<UpcomingTeamMatches teamId={position.team.id.toString()} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
