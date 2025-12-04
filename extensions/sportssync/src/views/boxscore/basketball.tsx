import { Detail, Icon, Action, ActionPanel } from "@raycast/api";
import getPlayByPlayEvents from "../../utils/getPlaybyPlay";
import Plays from "../playbyplay";
import { getBasketballBoxScore } from "../../utils/getBoxscore";
import TeamDetail from "../teamDetail";

const Basketball = ({ gameId }: { gameId: string }) => {
  const { playByPlayEventData, playByPlayLoading, playByPlayRevalidate } = getPlayByPlayEvents({ gameId });
  const { homeTeam, awayTeam, homeLeaders, awayLeaders } = getBasketballBoxScore(playByPlayEventData);

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
  - FG: ${homeTeam.fieldGoalAttempted} (${homeTeam.fieldGoalPct}%) ${parseFloat(homeTeam.fieldGoalPct) > parseFloat(awayTeam.fieldGoalPct) ? "🏆" : ""}
  - 3PT: ${homeTeam.threePointAttempted} (${homeTeam.threePointPct}%) ${parseFloat(homeTeam.threePointPct) > parseFloat(awayTeam.threePointPct) ? "🏆" : ""}
  - FT: ${homeTeam.freeThrowAttempted} (${homeTeam.freeThrowPct}%) ${parseFloat(homeTeam.freeThrowPct) > parseFloat(awayTeam.freeThrowPct) ? "🏆" : ""}
  - Turnovers: ${homeTeam.turnovers}

  ### ${awayTeam.name} (Away)
  - FG: ${awayTeam.fieldGoalAttempted} (${awayTeam.fieldGoalPct}%) ${parseFloat(awayTeam.fieldGoalPct) > parseFloat(homeTeam.fieldGoalPct) ? "🏆" : ""}
  - 3PT: ${awayTeam.threePointAttempted} (${awayTeam.threePointPct}%) ${parseFloat(awayTeam.threePointPct) > parseFloat(homeTeam.threePointPct) ? "🏆" : ""}
  - FT: ${awayTeam.freeThrowAttempted} (${awayTeam.freeThrowPct}%) ${parseFloat(awayTeam.freeThrowPct) > parseFloat(homeTeam.freeThrowPct) ? "🏆" : ""}
  - Turnovers: ${awayTeam.turnovers}
  `;

  return (
    <Detail
      markdown={markdownArea}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Leading Scorers"
            text={`${homeLeaders.leadingScorer.name} (${homeLeaders.leadingScorer.value}), ${awayLeaders.leadingScorer.name} (${awayLeaders.leadingScorer.value})`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Leading Assists"
            text={`${homeLeaders.leadingAssists.name} (${homeLeaders.leadingAssists.value}), ${awayLeaders.leadingAssists.name} (${awayLeaders.leadingAssists.value})`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Leading Rebounders"
            text={`${homeLeaders.leadingRebounder.name} (${homeLeaders.leadingRebounder.value}), ${awayLeaders.leadingRebounder.name} (${awayLeaders.leadingRebounder.value})`}
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

export default Basketball;
