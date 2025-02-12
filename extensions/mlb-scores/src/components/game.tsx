import { environment, Detail, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import React from "react";
import FeedInterface from "../interfaces/feed";
import { Player, Batting, TeamStatsPitching } from "../interfaces/feed";
import { resolve } from "path";
import useGameDataStore from "../lib/store";

const CACHE_DIR = resolve(environment.supportPath, "cache");

type GameProps = {
  index: number;
};

const generateBoxScore = (feed: FeedInterface): string => {
  const { gameData, liveData } = feed;
  const { teams: gameDataTeams } = gameData;
  const { boxscore } = liveData;
  const { teams: boxscoreTeams } = boxscore;

  const generateTeamBoxScore = (teamType: "away" | "home"): string => {
    const team = gameDataTeams[teamType];
    const boxscoreTeam = boxscoreTeams[teamType];
    const players = Object.values(boxscoreTeam.players);

    const batterRows = players
      .filter((player): player is Player & { stats: { batting: Batting } } => player.stats && "batting" in player.stats)
      .map((player) => {
        const batting = player.stats.batting;
        if (batting.atBats === undefined) return null;
        return `| ${player.person.fullName} (${player.position.abbreviation}) | ${batting.hits ?? "n/a"}/${
          batting.atBats
        } | ${batting.runs ?? "n/a"}/${batting.rbi ?? "n/a"} | ${batting.baseOnBalls ?? "n/a"}/${
          batting.strikeOuts ?? "n/a"
        }|`;
      })
      .filter((row): row is string => row !== null)
      .join("\n");

    const pitcherRows = players
      .filter(
        (player): player is Player & { stats: { pitching: TeamStatsPitching } } =>
          player.stats && "pitching" in player.stats
      )
      .map((player) => {
        const pitching = player.stats.pitching;
        if (pitching.inningsPitched === undefined) return null;
        return `| ${player.person.fullName} | ${pitching.inningsPitched}/${pitching.runsScoredPer9 || "n/a"} | ${
          pitching.hits
        }/${pitching.runs}/${pitching.earnedRuns} | ${pitching.baseOnBalls}/${pitching.strikeOuts} |`;
      })
      .filter((row): row is string => row !== null)
      .join("\n");

    return `
## ${team.name}

### Batting (this game)

| Player | H/AB | R/RBI | BB/SO |
|--------|------|-------|-------|
${batterRows}

### Pitching (this game)

| Player | IP/ERA | H/R/ER | BB/SO |
|--------|--------|--------|-------|
${pitcherRows}
`;
  };

  return `
${generateTeamBoxScore("away")}
${generateTeamBoxScore("home")}
  `.trim();
};

const Game = React.memo(
  (props: GameProps) => {
    const { data } = useGameDataStore();
    const [game, setGame] = useState<FeedInterface | undefined>();

    useEffect(() => {
      if (data !== undefined) {
        setGame(data[props.index][1]);
      }
    }, [data, props.index]);

    if (!data || !game) {
      return <Detail markdown="## Loading..." />;
    }

    const currentPlay = game.liveData.plays.currentPlay;
    const pitchSequence = currentPlay.playEvents
      .filter((event) => event.isPitch)
      .map((event, index) => ({
        description: event.details.description,
        index: index + 1, // Adding 1 to make it human-readable (1-based index)
      }))
      .reverse();

    const linescore = game.liveData.linescore;
    const runs_inning = Array(9).fill(["X", "X"]);
    linescore.innings.forEach((inning, index) => {
      const away = inning ? inning.away.runs || 0 : "X";
      const home = !(index === linescore.currentInning && linescore.isTopInning) ? inning.home.runs || 0 : "X";
      runs_inning[index] = [away, home];
    });

    const runnerDict = game.liveData.linescore.offense;
    let runners = 0;
    ["first", "second", "third"].forEach((base, index) => {
      if (base in runnerDict) {
        runners += 1 << index;
      }
    });
    let aw = false;
    let hw = false;
    if (
      game.gameData.status.abstractGameCode.toUpperCase() === "F" &&
      linescore.teams.away.runs > linescore.teams.home.runs
    ) {
      aw = true;
    } else if (
      game.gameData.status.abstractGameCode.toUpperCase() === "F" &&
      linescore.teams.home.runs > linescore.teams.away.runs
    ) {
      hw = true;
    }

    const d = new Date(game.gameData.datetime.dateTime);
    const tzName = d.toLocaleString("en", { timeZoneName: "short" }).split(" ").pop();
    const hrs = d.getHours() % 12;
    const date_string = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
      .getDate()
      .toString()
      .padStart(2, "0")} ${hrs ? hrs : 12}:${d.getMinutes().toString().padStart(2, "0")} ${
      d.getHours() >= 12 ? "pm" : "am"
    } ${tzName}`;
    const md_string = `
# ${aw ? "*" : ""}${game.gameData.teams.away.name} (${linescore.teams.away.runs ? linescore.teams.away.runs : "0"})${
      aw ? "*" : ""
    } <img src="${
      "file://" + resolve(CACHE_DIR, `${game.gameData.teams.away.id}.svg`).replace(" ", "%20")
    }" height="20" /> @ ${hw ? "*" : ""}${game.gameData.teams.home.name} (${
      linescore.teams.home.runs ? linescore.teams.home.runs : "0"
    })${hw ? "*" : ""} <img src="${
      "file://" + resolve(CACHE_DIR, `${game.gameData.teams.home.id}.svg`).replace(" ", "%20")
    }" height="20" />

${game.gameData.status.abstractGameCode.toUpperCase() === "P" ? `Starts at: ${date_string}` : ""}

${
  game.gameData.status.abstractGameCode.toUpperCase() === "L"
    ? `**Current Matchup:** (${currentPlay.matchup.pitchHand.code}HP) ${currentPlay.matchup.pitcher.fullName} vs ${
        currentPlay.matchup.batter.fullName
      } (${currentPlay.matchup.batSide.code})
  ${currentPlay.result.description !== undefined ? `**Latest:** ` + currentPlay.result.description : ""}`
    : " "
}

${game.gameData.status.detailedState}

\`${"".padEnd(3)}\`  ${runs_inning.map((_, index) => `\`${(index + 1).toString().padStart(2)}\``).join(" ")}

\`${game.gameData.teams.away.abbreviation.padStart(3)}\`  ${runs_inning
      .map((inning) => `\`${inning[0].toString().padStart(2)}\``)
      .join(" ")}

\`${game.gameData.teams.home.abbreviation.padStart(3)}\`  ${runs_inning
      .map((inning) => `\`${inning[1].toString().padStart(2)}\``)
      .join(" ")}

---

\`${"".padEnd(3)}\`  ${["R", "H", "E"].map((label) => `\`${label.padStart(2)}\``).join(" ")}

\`${game.gameData.teams.away.abbreviation.padStart(3)}\`  \`${(linescore.teams.away.runs || 0)
      .toString()
      .padStart(2)}\` \`${(linescore.teams.away.hits || 0).toString().padStart(2)}\` \`${(
      linescore.teams.away.errors || 0
    )
      .toString()
      .padStart(2)}\`

\`${game.gameData.teams.home.abbreviation.padStart(3)}\`  \`${(linescore.teams.home.runs || 0)
      .toString()
      .padStart(2)}\` \`${(linescore.teams.home.hits || 0).toString().padStart(2)}\` \`${(
      linescore.teams.home.errors || 0
    )
      .toString()
      .padStart(2)}\`

${
  game.gameData.status.abstractGameCode.toUpperCase() === "L"
    ? `<img src="file://${resolve(environment.assetsPath, `${runners}.svg`).replace(" ", "%20")}" height="100" />`
    : ""
}

---

${game.gameData.status.abstractGameCode.toUpperCase() === "L" ? `## Box  \n` + generateBoxScore(game) : ""}

## Copyright
${game.copyright}
    `;
    return (
      <Detail
        markdown={md_string}
        metadata={
          game.gameData.status.abstractGameCode.toUpperCase() === "L" ? (
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Game Details"
                text={`${linescore.inningState} ${linescore.currentInningOrdinal}. ${currentPlay.count.outs} Out${
                  currentPlay.count.outs !== 1 ? `s` : ""
                }. ${currentPlay.count.balls} Ball${currentPlay.count.balls !== 1 ? "s" : ""}, ${
                  currentPlay.count.strikes
                } Strike${currentPlay.count.strikes !== 1 ? `s` : ""}.`}
              />
              {pitchSequence.map((pitch, idx) => (
                <React.Fragment key={pitch.index}>
                  <Detail.Metadata.Label
                    title={idx === 0 ? "Pitch Sequence" : ""}
                    text={`${pitch.index}. ${pitch.description}`}
                  />
                  <Detail.Metadata.Separator />
                </React.Fragment>
              ))}
            </Detail.Metadata>
          ) : null
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Actions">
              <Action.OpenInBrowser title="Open in MLB" url={`https://www.mlb.com/gameday/${game.gamePk}`} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  },
  (prev, next) => prev.index === next.index
);

export default Game;
