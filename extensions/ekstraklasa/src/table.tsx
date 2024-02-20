import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import useTable from "./hooks/useTable";
import { MATCH_RESULT } from "./types";

export default function Command() {
  const standings = useTable();

  return (
    <List throttle isLoading={!standings}>
      {standings?.map((team) => (
        <List.Item
          key={team.position}
          icon={team.logoUrl}
          title={team.position.toString()}
          subtitle={team.teamName}
          keywords={team.teamName.split(" ")}
          accessories={[
            { icon: Icon.SoccerBall, text: team.gamesPlayed.toString(), tooltip: "Games Played" },
            {
              icon: Icon.Goal,
              text: `${team.goalsFor.toString()} - ${team.goalsAgainst.toString()}`,
              tooltip: "Goals For - Goals Against",
            },
            ...team.lastResults.map((result) => ({
              icon: {
                source: Icon.CircleFilled,
                tintColor:
                  result === MATCH_RESULT.LOST
                    ? Color.Red
                    : result === MATCH_RESULT.DRAW
                      ? Color.SecondaryText
                      : Color.Green,
              },
              tooltip: result === MATCH_RESULT.LOST ? "Lost" : result === MATCH_RESULT.DRAW ? "Draw" : "Won",
            })),
            { icon: Icon.Trophy, text: team.teamPoints.toString(), tooltip: "Points" },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Team Name to Clipboard" content={team.teamName} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
