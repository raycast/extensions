import { Detail, Icon, Action, ActionPanel } from "@raycast/api";
import getPlayByPlayEvents from "../../utils/getPlaybyPlay";
import { getFootballBoxScore } from "../../utils/getBoxscore";
import TeamDetail from "../teamDetail";
import Plays from "../playbyplay";

const Football = ({ gameId }: { gameId: string }) => {
  const { playByPlayEventData, playByPlayLoading, playByPlayRevalidate } = getPlayByPlayEvents({ gameId });
  const boxScore = getFootballBoxScore(playByPlayEventData);

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

  ### ${boxScore.homeTeam.name} (Home)
  - Total Yards: ${boxScore.homeTeam.totalYards}
  - Turnovers: ${boxScore.homeTeam.turnovers}
  - Penalties: ${boxScore.homeTeam.penalties}
  - 3rd Downs: ${boxScore.homeTeam.thirdDowns}
  
  ### ${boxScore.awayTeam.name} (Away)
  - Total Yards: ${boxScore.awayTeam.totalYards}
  - Turnovers: ${boxScore.awayTeam.turnovers}
  - Penalties: ${boxScore.awayTeam.penalties}
  - 3rd Downs: ${boxScore.awayTeam.thirdDowns}
  `;

  return (
    <Detail
      markdown={markdownArea}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Home QB"
            text={
              boxScore.homePlayers.qb.shortName
                ? `${boxScore.homePlayers.qb.shortName} (${boxScore.homePlayers.qb.displayValue})`
                : "No QB data"
            }
            icon={boxScore.homePlayers.qb.headshot}
          />
          <Detail.Metadata.Label
            title="Away QB"
            text={
              boxScore.awayPlayers.qb.shortName
                ? `${boxScore.awayPlayers.qb.shortName} (${boxScore.awayPlayers.qb.displayValue})`
                : "No QB data"
            }
            icon={boxScore.awayPlayers.qb.headshot}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Home WR"
            text={
              boxScore.homePlayers.wr.shortName
                ? `${boxScore.homePlayers.wr.shortName} (${boxScore.homePlayers.wr.displayValue})`
                : "No WR data"
            }
            icon={boxScore.homePlayers.wr.headshot}
          />
          <Detail.Metadata.Label
            title="Away WR"
            text={
              boxScore.awayPlayers.wr.shortName
                ? `${boxScore.awayPlayers.wr.shortName} (${boxScore.awayPlayers.wr.displayValue})`
                : "No WR data"
            }
            icon={boxScore.awayPlayers.wr.headshot}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Home RB"
            text={
              boxScore.homePlayers.rb.shortName
                ? `${boxScore.homePlayers.rb.shortName} (${boxScore.homePlayers.rb.displayValue})`
                : "No RB data"
            }
            icon={boxScore.homePlayers.rb.headshot}
          />
          <Detail.Metadata.Label
            title="Away RB"
            text={
              boxScore.awayPlayers.rb.shortName
                ? `${boxScore.awayPlayers.rb.shortName} (${boxScore.awayPlayers.rb.displayValue})`
                : "No RB data"
            }
            icon={boxScore.awayPlayers.rb.headshot}
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
              title={`View ${boxScore.awayTeam.name ?? "Away"} Team Details`}
              icon={Icon.List}
              target={<TeamDetail teamId={boxScore.awayTeam.id} />}
            />
            <Action.Push
              title={`View ${boxScore.homeTeam.name ?? "Home"} Team Details`}
              icon={Icon.List}
              target={<TeamDetail teamId={boxScore.homeTeam.id} />}
            />
          </>
        </ActionPanel>
      }
    />
  );
};

export default Football;
