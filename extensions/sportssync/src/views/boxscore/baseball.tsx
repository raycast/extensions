import { Detail, Icon, Action, ActionPanel } from "@raycast/api";
import getPlayByPlayEvents, { PlayByPlayData, Play } from "../../utils/getPlaybyPlay";
import TeamDetail from "../teamDetail";
import Plays from "../playbyplay";

const findPlayer = ({
  playerType,
  lastPlay,
  playByPlayEventData,
}: {
  playerType: "batter" | "pitcher";
  lastPlay: Play | undefined;
  playByPlayEventData: PlayByPlayData | undefined;
}) => {
  const playerParticipant = lastPlay?.participants?.find((p) => p.type === playerType);
  const playerId = playerParticipant?.athlete?.id;

  const allAthletes = playByPlayEventData?.boxscore.players.flatMap(
    (team) => team?.statistics?.flatMap((stat) => stat?.athletes) || [],
  );

  const currentPlayer = allAthletes?.find((a) => a?.athlete?.id === playerId);

  return { playerId, currentPlayer };
};

const Baseball = ({ gameId }: { gameId: string }) => {
  const { playByPlayEventData, playByPlayLoading, playByPlayRevalidate } = getPlayByPlayEvents({ gameId });

  const liveGame = {
    id: gameId,
    lastPlay: playByPlayEventData?.plays?.[playByPlayEventData.plays.length - 1],
    outs: playByPlayEventData?.situation?.outs || 0,
    strikes: playByPlayEventData?.situation?.strikes || 0,
    balls: playByPlayEventData?.situation?.balls || 0,
    onFirst: !!playByPlayEventData?.situation?.onFirst,
    onSecond: !!playByPlayEventData?.situation?.onSecond,
    onThird: !!playByPlayEventData?.situation?.onThird,
  };

  const homeTeam = {
    id: playByPlayEventData?.boxscore?.teams?.[1]?.team?.id || "",
    name: playByPlayEventData?.boxscore?.teams?.[1]?.team?.displayName,
    hits:
      playByPlayEventData?.boxscore?.teams?.[1]?.statistics
        ?.find((stat) => stat.name === "batting")
        ?.stats?.find((stat) => stat.name === "hits")?.displayValue || "0",
    errors:
      playByPlayEventData?.boxscore?.teams?.[1]?.statistics
        ?.find((stat) => stat.name === "fielding")
        ?.stats?.find((stat) => stat.name === "errors")?.displayValue || "0",
  };

  const awayTeam = {
    id: playByPlayEventData?.boxscore?.teams?.[0]?.team?.id || "",
    name: playByPlayEventData?.boxscore?.teams?.[0]?.team?.displayName,
    hits:
      playByPlayEventData?.boxscore?.teams?.[0]?.statistics
        ?.find((stat) => stat.name === "batting")
        ?.stats?.find((stat) => stat.name === "hits")?.displayValue || "0",
    errors:
      playByPlayEventData?.boxscore?.teams?.[0]?.statistics
        ?.find((stat) => stat.name === "fielding")
        ?.stats?.find((stat) => stat.name === "errors")?.displayValue || "0",
  };

  const { playerId: batterId, currentPlayer: currentBatter } = findPlayer({
    playerType: "batter",
    lastPlay: liveGame.lastPlay,
    playByPlayEventData,
  });

  const { playerId: pitcherId, currentPlayer: currentPitcher } = findPlayer({
    playerType: "pitcher",
    lastPlay: liveGame.lastPlay,
    playByPlayEventData,
  });

  const batter = {
    id: batterId,
    name: currentBatter?.athlete?.shortName || "",
    headshot: currentBatter?.athlete?.headshot?.href || "",
    atBats: currentBatter?.stats[0] || "",
    batAvg: currentBatter?.stats[9] || "",
  };

  const pitcher = {
    id: pitcherId,
    name: currentPitcher?.athlete?.shortName || "",
    headshot: currentPitcher?.athlete?.headshot?.href || "",
    era: currentPitcher?.stats[8] || "",
    inningsPitched: currentPitcher?.stats[0] || "",
    strikeouts: currentPitcher?.stats[5] || "",
  };

  const filled = "●";
  const empty = "○";
  const noBases = !(liveGame.onFirst || liveGame.onSecond || liveGame.onThird);

  if (playByPlayLoading) {
    return <Detail isLoading={true} />;
  }

  if (!playByPlayEventData) {
    return <Detail markdown="No data found." />;
  }

  const markdownArea = `
  ### Last Play
  > ${liveGame.lastPlay?.text}
  ---

  ### Home
  - **Home Team:** ${homeTeam.name}
  - Hits: ${homeTeam.hits}
  - Errors: ${homeTeam.errors}

  ### Away
  - **Away Team:** ${awayTeam.name}
  - Hits: ${awayTeam.hits}
  - Errors: ${awayTeam.errors}
  `;
  return (
    <Detail
      markdown={markdownArea}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Pitcher"
            text={
              pitcher.name
                ? pitcher.inningsPitched && pitcher.era
                  ? `${pitcher.name} (${pitcher.inningsPitched} IP, ${pitcher.era} ERA)`
                  : pitcher.name
                : "No pitcher data"
            }
            icon={pitcher.headshot}
          />
          <Detail.Metadata.Label
            title="Batter"
            text={
              batter.name
                ? batter.atBats && batter.batAvg
                  ? `${batter.name} (${batter.atBats} AB, ${batter.batAvg} BA)`
                  : batter.name
                : "No batter data"
            }
            icon={batter.headshot}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Bases"
            text={
              noBases
                ? "None"
                : [liveGame.onFirst && "1st", liveGame.onSecond && "2nd", liveGame.onThird && "3rd"]
                    .filter(Boolean)
                    .join(" ")
            }
          />
          <Detail.Metadata.Label title="Count" text={`${liveGame.balls}-${liveGame.strikes}`} />
          <Detail.Metadata.Label title="Outs" text={filled.repeat(liveGame.outs) + empty.repeat(3 - liveGame.outs)} />
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

export default Baseball;
