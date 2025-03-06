import React from "react";
import { ActionPanel, Detail } from "@raycast/api";
import { getNHL } from "../utils/nhlData";
import {
  PlayerDetailResponse,
  GoalieStats,
  SkaterStats,
  PlayerBio,
  Last5Game,
  Last5GameGoalie,
  Last5GameSkater,
  SeasonTotal,
  GoalieSeasonTotal,
  SkaterSeasonTotal,
  Award,
} from "../utils/types";
import { userInterface } from "../utils/translations";
import { convertInchesToFeetAndInches, getFlagEmoji, getLanguageKey, calculateAge } from "../utils/helpers";
import { playerTitleStrings, gameStrings, timeStrings } from "../utils/translations";
import { useFetch } from "@raycast/utils";
import { TABLE_HEADERS } from "../utils/constants";

import Unresponsive from "./unresponsive";
import { PlayerAction } from "./gameActions";

const lang = getLanguageKey();

type Player = {
  data: PlayerDetailResponse;
  isLoading: boolean;
};

type PlayerBioResponse = {
  data: PlayerBio;
  isLoading: boolean;
};

// Type guard for GoalieStats
function isGoalieStats(stats: GoalieStats | SkaterStats | Last5Game | SeasonTotal): stats is GoalieStats {
  return "savePctg" in stats || "wins" in stats;
}

// Type guard for SkaterStats
function isSkaterStats(stats: GoalieStats | SkaterStats | Last5Game | SeasonTotal): stats is SkaterStats {
  return "assists" in stats;
}

const birthday = function (player: PlayerDetailResponse): string {
  let birthday = "";
  birthday += player.birthDate ? `${player.birthDate}` : "";

  if (player.isActive) {
    birthday += ` (${playerTitleStrings.age[lang]}: ${calculateAge(player.birthDate)})`;
  }

  return birthday;
};

const shootsOrCatches = (player: PlayerDetailResponse): string => {
  if (!player.shootsCatches) return "";

  const key = player.position === "G" ? "catches" : "shoots";
  return playerTitleStrings[key][lang];
};

const draftInfo = function (player: PlayerDetailResponse): string {
  const draft = player?.draftDetails;

  if (!draft) return "";

  return `${draft.year}, ${draft.teamAbbrev} (${draft.overallPick} ${playerTitleStrings.overall[lang]}), ${playerTitleStrings.round[lang]}${draft.round}, ${playerTitleStrings.pick[lang]}${draft.pickInRound}`;
};

const summaryStats = function (
  player: PlayerDetailResponse,
  stats?: GoalieStats | SkaterStats | null,
  title?: string,
): string {
  if (!stats || !player || !title) return "";

  let table = `${title} \n`;

  if (player.position === "G" && isGoalieStats(stats)) {
    table += TABLE_HEADERS.SEASON.GOALIE;
    table += `| ${stats.gamesPlayed ?? 0} | ${stats.wins ?? 0} | ${stats.losses ?? 0} | ${stats.shutouts ?? 0} | ${
      stats.goalsAgainstAvg ? stats.goalsAgainstAvg.toFixed(3) : "0.000"
    } | ${stats.savePctg ? (100 * stats.savePctg).toFixed(2) : "0.00"}% |`;
  } else if (isSkaterStats(stats)) {
    // Skater stats
    table += TABLE_HEADERS.SEASON.SKATER;
    table += `| ${stats.gamesPlayed ?? "-"} | ${stats.goals ?? "-"} | ${stats.assists ?? "-"} | ${stats.points ?? "-"} | ${
      stats.plusMinus ?? "-"
    } |`;
  }

  return table;
};

const careerStats = function (player: PlayerDetailResponse, title: string): string {
  if (!player || !title) return "";

  // loop through career stats to get some basic info about our players
  const careerStats = player.seasonTotals;
  let isSkater = true; // if they are a skater or a goalie
  let isInNHL = false; // if they've had a year in professional hockey
  for (const year of careerStats) {
    if (isGoalieStats(year)) {
      // if they have goalie stats, they are a goalie
      isSkater = false;
    }
    if (year.leagueAbbrev === "NHL" || year.leagueAbbrev === "AHL") {
      isInNHL = true; // if they have a year in the NHL or AHL, they are in the NHL
    }
  }

  if (!isInNHL) return "";
  let table = `## ${title} \n`;

  if (isSkater) {
    // Skater stats
    table += TABLE_HEADERS.CAREER.SKATER;
    const reversedStats = [...careerStats].reverse();
    reversedStats
      .filter((stat): stat is SkaterSeasonTotal => isSkaterStats(stat))
      .map((stat) => {
        table += `| ${stat.season.toString().slice(2, 4)}-${stat.season.toString().slice(6, 8)} ${stat.leagueAbbrev}, ${stat.teamName.default} | ${stat.gamesPlayed ?? "-"}/${stat.goals ?? "-"}/${stat.assists ?? "-"}/${stat.points ?? "-"}/${stat.plusMinus ?? "-"} | ${stat.pim ?? "-"}/${stat.powerPlayGoals ?? "-"}/${stat.shorthandedGoals ?? "-"} | ${stat.shots ?? "-"}/${stat.shootingPctg ? (stat.shootingPctg * 100).toFixed(2) + "%" : "-"}/${stat.faceoffWinningPctg ? (100 * stat.faceoffWinningPctg).toFixed(2) + "%" : "-"} |\n`;
      });
  } else if (!isSkater) {
    // goalie stats
    table += TABLE_HEADERS.CAREER.GOALIE;
    const reversedStats = [...careerStats].reverse();
    reversedStats
      .filter((stat): stat is GoalieSeasonTotal => isGoalieStats(stat))
      .map((stat) => {
        table += `| ${stat.season.toString().slice(2, 4)}-${stat.season.toString().slice(6, 8)} ${stat.leagueAbbrev}, ${stat.teamName.default} | ${stat.gamesPlayed ?? "-"} / ${stat.gamesStarted ?? "-"} | ${stat.wins ?? "-"} / ${stat.losses ?? "-"} / ${stat.ties ?? "-"} | ${stat.shotsAgainst ?? "-"} / ${stat.goalsAgainstAvg.toFixed(2) ?? "-"} / ${(100 * stat.savePctg).toFixed(2)}% |\n`;
      });
  }

  return table;
};

const last5Games = function (stats: Last5Game[]): string {
  if (!stats) return "";

  function dateFormat(stat: Last5Game): string {
    let date = `[${stat.gameDate} ${stat.homeRoadFlag === "H" ? "vs" : "@"} ${stat.opponentAbbrev}](https://www.nhl.com/gamecenter/${stat.gameId})`;

    if ("decision" in stat) {
      date += ` (${stat.decision})`;
    }

    return date;
  }

  let table = `## ${timeStrings.last5Games[lang]} \n`;
  if (isGoalieStats(stats[0])) {
    const goalieStats = stats as Last5GameGoalie[];
    table += TABLE_HEADERS.LAST5.GOALIE;
    goalieStats.map((stat) => {
      table += `| ${dateFormat(stat)} | ${stat.shotsAgainst} / ${stat.goalsAgainst} | ${stat.savePctg ? (100 * stat.savePctg).toFixed(2) : "0.00"}% | ${stat.toi} |\n`;
    });
  } else if (isSkaterStats(stats[0])) {
    const skateStats = stats as Last5GameSkater[];
    table += TABLE_HEADERS.LAST5.SKATER;
    skateStats.map((stat) => {
      table += `| ${dateFormat(stat)} | ${stat.goals}/${stat.assists}/${stat.points}/${stat.plusMinus} | ${stat.pim}/${stat.powerPlayGoals}/${stat.shorthandedGoals} | ${stat.shifts}/${stat.toi} |\n`;
    });
  }

  return table;
};

const awardsTable = function (player: PlayerDetailResponse): string {
  const awards = player.awards;

  if (!awards) return "";

  let awardString = `## ${userInterface.awards[lang]} \n`;
  awards.map((award: Award) => {
    awardString += `| ${award.trophy.default} | GP | +/- |\n`;
    awardString += `|---|---|---|\n`;
    award.seasons.map((season) => {
      awardString += `| ${season.seasonId.toString().slice(0, 4)}-${season.seasonId.toString().slice(4, 8)} | ${season.gamesPlayed} | ${season.plusMinus} |\n`;
    });
    awardString += `\n\n`;
  });

  return awardString;
};

const awardMetadata = function (player: PlayerDetailResponse) {
  if (!player.awards) return null;

  const awardTimes = (award: Award) => {
    const baseName = award.trophy.default.replace(/Trophy|Award/g, "").trim();
    const suffix = award.seasons.length > 1 ? ` 𐔧${award.seasons.length}` : "";
    return `${baseName}${suffix}`;
  };

  return (
    <Detail.Metadata.TagList title={userInterface.awards[lang]}>
      {player.awards.map((award: Award) => (
        <Detail.Metadata.TagList.Item key={award.trophy.default} text={awardTimes(award)} />
      ))}
    </Detail.Metadata.TagList>
  );
};

export default function PlayerDetail({ id }: { id: number }) {
  const playerData = getNHL(`player/${id}/landing`) as Player;
  const playerBio = useFetch(
    `https://forge-dapi.d3.nhle.com/v2/content/en-us/players?tags.slug=playerid-${id}`,
  ) as PlayerBioResponse;

  if (playerData.isLoading || playerBio.isLoading)
    return <Detail isLoading={true} markdown={userInterface.loading[getLanguageKey()]} />;

  // Add additional check for playerData.data
  if (!playerData?.data) return <Unresponsive />;

  const player = playerData.data;

  // Add null checks for all nested properties
  let playerMarkdown = `# ${player.firstName?.default || ""} ${player.lastName?.default || ""} ${
    player.sweaterNumber ? `#${player.sweaterNumber}` : ""
  }, ${player.position || ""} <img src="${player.headshot || ""}" width="50" height="50" /> ${
    player.inHHOF ? '<img src="https://assets.nhle.com/badges/hockey_hof.svg" width="50" height="50" />' : ""
  } ${
    player.inTop100AllTime
      ? '<img src="https://assets.nhle.com/badges/100_greatest_players.svg" width="50" height="50">'
      : ""
  } \n --- \n ${player.heroImage ? `![](${player.heroImage})` : ""} \n `;

  // Last season
  if (player.featuredStats?.regularSeason?.subSeason) {
    playerMarkdown +=
      summaryStats(
        player,
        player.featuredStats?.regularSeason?.subSeason,
        player.featuredStats.season.toString().slice(-4) + " " + gameStrings.seasonStats[lang],
      ) + "\n\n";
  }

  // Career summary
  playerMarkdown +=
    summaryStats(player, player.featuredStats?.regularSeason?.career, playerTitleStrings.career[lang]) + "\n\n";

  // Last playoff appearance
  if (player.featuredStats?.regularSeason?.subSeason) {
    playerMarkdown +=
      summaryStats(
        player,
        player.featuredStats?.playoffs?.subSeason,
        player.featuredStats.season.toString().slice(-4) + " " + gameStrings.playoffs[lang],
      ) + "\n\n";
  }

  // Career Playoffs
  playerMarkdown +=
    summaryStats(
      player,
      player.featuredStats?.playoffs?.career,
      playerTitleStrings.career[lang] + " " + gameStrings.playoffs[lang],
    ) + "\n\n";

  // last 5 games
  playerMarkdown += last5Games(player.last5Games) + "\n\n";

  // Career Stats
  playerMarkdown += careerStats(player, playerTitleStrings.career[lang]) + "\n\n";

  // Awards
  playerMarkdown += awardsTable(player) + "\n\n";

  // Player Bio
  if (playerBio.data.items[0] && playerBio.data.items[0].fields.biography) {
    playerMarkdown += `## ${userInterface.biography[lang]} \n ${playerBio.data.items[0].fields.biography} \n\n`;
  }

  return (
    <Detail
      actions={
        <ActionPanel>
          <PlayerAction name={`${player.firstName[lang]} ${player.lastName[lang]}`} slug={player.playerSlug} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {player.awards && awardMetadata(player)}
          <Detail.Metadata.Label
            title={playerTitleStrings.birthplace[lang]}
            text={`${player.birthCity.default ? `${player.birthCity.default},` : ""} ${player.birthCountry ? `${player.birthCountry} ${getFlagEmoji(player.birthCountry)}` : ""}`}
          />
          {player.heightInInches && (
            <Detail.Metadata.Label
              title={playerTitleStrings.height[lang]}
              text={convertInchesToFeetAndInches(player.heightInInches)}
            />
          )}
          {player.weightInPounds && (
            <Detail.Metadata.Label title={playerTitleStrings.weight[lang]} text={`${player.weightInPounds} lb`} />
          )}
          {player.birthDate && (
            <Detail.Metadata.Label title={playerTitleStrings.birthdate[lang]} text={birthday(player)} />
          )}
          {player.shootsCatches && (
            <Detail.Metadata.Label title={shootsOrCatches(player)} text={player.shootsCatches} />
          )}
          {player.draftDetails && (
            <Detail.Metadata.Label title={playerTitleStrings.draft[lang]} text={draftInfo(player)} />
          )}
        </Detail.Metadata>
      }
      markdown={playerMarkdown}
    />
  );
}
