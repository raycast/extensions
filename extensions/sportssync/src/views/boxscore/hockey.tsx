import { Detail, Icon, Action, ActionPanel } from "@raycast/api";
import getPlayByPlayEvents from "../../utils/getPlaybyPlay";
import Plays from "../playbyplay";
import TeamDetail from "../teamDetail";
import { getHockeyBoxScore } from "../../utils/getBoxscore";

const Hockey = ({ gameId }: { gameId: string }) => {
  const { playByPlayEventData, playByPlayLoading, playByPlayRevalidate } = getPlayByPlayEvents({ gameId });
  const { homeTeam, awayTeam, homeLeaders, awayLeaders } = getHockeyBoxScore(playByPlayEventData);

  if (playByPlayLoading) {
    return <Detail isLoading={true} />;
  }

  if (!playByPlayEventData) {
    return <Detail markdown="No data found." />;
  }

  const markdownArea = `
  ### Last Play
  > ${playByPlayEventData?.plays?.[playByPlayEventData.plays.length - 1].text}
  ---

  ### ${homeTeam.name} (Home)
  - Hits: ${homeTeam.hits} ${parseFloat(homeTeam.hits) > parseFloat(awayTeam.hits) ? "🏆" : ""}
  - Shots: ${homeTeam.shots} ${parseFloat(homeTeam.shots) > parseFloat(awayTeam.shots) ? "🏆" : ""}
  - Takeaways: ${homeTeam.takeaways} ${parseFloat(homeTeam.takeaways) > parseFloat(awayTeam.takeaways) ? "🏆" : ""}
  - Powerplay %: ${homeTeam.powerPlayPct}
  - Face-off %: ${homeTeam.faceOffPct}
  - Penalties: ${homeTeam.penalties}

  ### ${awayTeam.name} (Away)
  - Hits: ${awayTeam.hits} ${parseFloat(awayTeam.hits) > parseFloat(homeTeam.hits) ? "🏆" : ""}
  - Shots: ${awayTeam.shots} ${parseFloat(awayTeam.shots) > parseFloat(homeTeam.shots) ? "🏆" : ""}
  - Takeaways: ${awayTeam.takeaways} ${parseFloat(awayTeam.takeaways) > parseFloat(homeTeam.takeaways) ? "🏆" : ""}
  - Powerplay %: ${awayTeam.powerPlayPct}
  - Face-off %: ${awayTeam.faceOffPct}
  - Penalties: ${awayTeam.penalties}
`;

  return (
    <Detail
      markdown={markdownArea}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Leading Scorers"
            text={`${homeLeaders.leadingGoals.shortName} (${homeLeaders.leadingGoals.displayValue}), ${awayLeaders.leadingGoals.shortName} (${awayLeaders.leadingGoals.displayValue})`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Leading Assists"
            text={`${homeLeaders.leadingAssists.shortName} (${homeLeaders.leadingAssists.displayValue}), ${awayLeaders.leadingAssists.shortName} (${awayLeaders.leadingAssists.displayValue})`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Leading Points"
            text={`${homeLeaders.leadingPoints.shortName} (${homeLeaders.leadingPoints.displayValue}), ${awayLeaders.leadingPoints.shortName} (${awayLeaders.leadingPoints.displayValue})`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push title="View Play by Play" icon={Icon.Stopwatch} target={<Plays gameId={gameId} />} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={playByPlayRevalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <>
            <Action.Push
              title={`View ${awayTeam.name ?? "Away"} Team Details`}
              icon={Icon.List}
              target={<TeamDetail teamId={awayTeam.id} />}
            />
            <Action.Push
              title={`View ${homeTeam.name ?? "Home"} Team Details`}
              icon={Icon.List}
              target={<TeamDetail teamId={homeTeam.id} />}
            />
          </>
        </ActionPanel>
      }
    />
  );
};

export default Hockey;
