import {
  ScoreboardResponse,
  Game,
  SortedGames,
  Timezone,
  Clock,
  PeriodDescriptor,
  TeamInfo,
  Linescore,
  Period,
  GamecenterRightRailResponse,
  GameStringCategory,
  TeamSeasonStats,
  TeamSeasonStat,
  PlayerOnIce,
  TeamStats,
} from "./types";
import { getPreferenceValues, Color, environment } from "@raycast/api";
import { timeStrings, gameStrings, playerTitleStrings, userInterface } from "./translations";

const preferences = getPreferenceValues();
const timezone = preferences.timezone as Timezone;
const languageKey = getLanguageKey();

export function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function penaltiesList(game: Game) {
  const penalties = game.summary?.penalties;
  if (!penalties) return "";
  let penaltyList = "## Penalties \n";
  for (const period of penalties) {
    penaltyList += `### ${getOrdinalPeriod(period.periodDescriptor.number)} \n`;
    if (period.penalties.length === 0) {
      penaltyList += "No penalties this period. \n\n";
    } else {
      for (const penalty of period.penalties) {
        penaltyList += ` - <img src="${teamLogo(penalty.teamAbbrev.default)}" width="20" height="20" /> | \`${penalty.timeInPeriod}\` | ${penalty.committedByPlayer} (${penalty.duration}:00) - ${penalty.descKey} against ${penalty.drawnBy}`;
        penaltyList += `\n`;
      }
    }
  }
  return penaltyList;
}

export function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .slice(0, 2)
    .map((char) => 127397 + char.charCodeAt(0));

  let countryFlag = String.fromCodePoint(...codePoints);

  if (countryCode === "SWE") countryFlag = "🇸🇪";

  return countryFlag;
}

export function calculateAge(birthdateString: string): number {
  const today = new Date();
  const birthdate = new Date(birthdateString);

  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDifference = today.getMonth() - birthdate.getMonth();
  const dayDifference = today.getDate() - birthdate.getDate();

  // Adjust age if the current date is before the birthday in the current year
  if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
    age--;
  }

  return age;
}

export function convertInchesToFeetAndInches(inches: number): string {
  if (inches < 0) {
    throw new Error("Inches cannot be negative");
  }

  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;

  return `${feet}' ${remainingInches}"`;
}

export function scoresList(game: Game) {
  const scoring = game.summary?.scoring;
  if (!scoring) return "";
  let scores = "## Scoring \n";
  for (const period of scoring) {
    scores += `### ${getOrdinalPeriod(period.periodDescriptor.number)} \n`;
    if (period.goals.length === 0) {
      scores += "No goals scored this period. \n\n";
    } else {
      for (const goal of period.goals) {
        scores += ` - <img src="${teamLogo(goal.teamAbbrev.default)}" width="20" height="20" /> | **[${goal.homeScore} - ${goal.awayScore}](${goal.highlightClipSharingUrl})** | \`${goal.timeInPeriod}\` | ${goal.shotType} | <img src="${goal.headshot}" alt="" width="20" height="20" /> ${goal.firstName.default} ${goal.lastName.default} (${goal.goalsToDate}) ${goal.strength === "pp" ? "PPG" : ""}`;
        if (goal.assists.length > 0) {
          scores += " | ";
        }
        for (const [index, assist] of goal.assists.entries()) {
          scores += `A: ${assist.name.default} (${assist.assistsToDate})${index < goal.assists.length - 1 ? ", " : ""}`;
        }
        scores += `\n`;
      }
    }
  }
  return scores;
}

export function convertTeamSeasonStatsFormat(teamSeasonStats: TeamSeasonStats): TeamSeasonStat[] {
  const result: TeamSeasonStat[] = [];

  // Define the keys type to match TeamStats properties
  type TeamStatsKeys = keyof TeamStats;

  // Type assertion for the keys
  const keys = Object.keys(teamSeasonStats.awayTeam) as TeamStatsKeys[];

  keys.forEach((key) => {
    result.push({
      category: key,
      awayValue: teamSeasonStats.awayTeam[key],
      homeValue: teamSeasonStats.homeTeam[key],
    });
  });

  return result;
}

export function summaryStats(
  gameSidebar: GamecenterRightRailResponse,
  homeTeam: TeamInfo,
  awayTeam: TeamInfo,
  gameState: "live" | "pre",
): string {
  // Check if the data we need exists
  // count for both game (live or post) as well as pre-game (teamSeasonStats)
  if (!gameSidebar.teamGameStats && !gameSidebar.teamSeasonStats) return userInterface.noData[languageKey];

  // set our original data
  let stats = gameSidebar.teamGameStats;

  // if this is pre-game, let's format the data into the same format as the live game data structure
  if (gameState === "pre") {
    stats = convertTeamSeasonStatsFormat(gameSidebar.teamSeasonStats);
  }

  if (!stats) return userInterface.noData[languageKey];

  const home = homeTeam.abbrev;
  const away = awayTeam.abbrev;

  // Initialize the summary
  let summary = ``;
  summary += `| ${home} <img src="${teamLogo(home)}" width="20" height="20" /> |  | ${away} <img src="${teamLogo(away)}" width="20" height="20" /> |\n`;
  summary += `|:---:|:---:|:---:|\n`;

  // Iterate through the stats and build the summary
  for (const stat of stats) {
    const category = stat.category as GameStringCategory;

    if (typeof stat.homeValue === "string") {
      // If homeValue is a string, just insert it directly
      summary += `| ${stat.homeValue} | ${gameStrings[category][languageKey]} | ${stat.awayValue} |\n`;
    } else if (typeof stat.homeValue === "number") {
      if (Number.isInteger(stat.homeValue)) {
        // If homeValue is an integer, display it as is
        summary += `| ${stat.homeValue} | ${gameStrings[category][languageKey]} | ${stat.awayValue} |\n`;
      } else {
        // If homeValue is a float, format it as a percentage
        // for whatever reason `goalsForPerGamePlayed` is a special case. can't score 357% goals per game lol
        if (category === "goalsForPerGamePlayed" || category === "goalsAgainstPerGamePlayed") {
          summary += `| ${stat.homeValue} | ${gameStrings[category][languageKey]} | ${stat.awayValue} |\n`;
        } else {
          const homeValuePercentage = (stat.homeValue * 100).toFixed(2) + "%";
          const awayValuePercentage =
            typeof stat.awayValue === "number"
              ? Number.isInteger(stat.awayValue)
                ? stat.awayValue.toString()
                : (stat.awayValue * 100).toFixed(2) + "%"
              : stat.awayValue;
          summary += `| ${homeValuePercentage} | ${gameStrings[category][languageKey]} | ${awayValuePercentage} |\n`;
        }
      }
    }
  }

  return summary;
}

export function sortGames(apiResponse: ScoreboardResponse): SortedGames {
  // Create a date object in the user's timezone
  const now = new Date();
  const userTimeZone = timezone.timezone;

  // Get the start of today in the user's timezone
  const todayStart = new Date(now.toLocaleString("en-US", { timeZone: userTimeZone }));
  todayStart.setHours(0, 0, 0, 0);

  // Get the end of today in the user's timezone
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const pastGames: Game[] = [];
  const todayGames: Game[] = [];
  const futureGames: Game[] = [];

  if (!apiResponse) return { pastGames, todayGames, futureGames };

  apiResponse.gamesByDate.forEach((dateEntry) => {
    dateEntry.games.forEach((game) => {
      const gameTime = new Date(game.startTimeUTC);

      // Convert game time to user's timezone
      const gameTimeInUserTZ = new Date(gameTime.toLocaleString("en-US", { timeZone: userTimeZone }));

      if (gameTimeInUserTZ >= todayStart && gameTimeInUserTZ <= todayEnd) {
        todayGames.push(game);
      } else if (gameTimeInUserTZ < todayStart) {
        pastGames.push(game);
      } else {
        futureGames.push(game);
      }
    });
  });

  return {
    pastGames,
    todayGames,
    futureGames,
  };
}

export function teamLogo(abbrev: string): string {
  if (!abbrev) return "";
  // return local logos for now
  return `team-logos/${abbrev}_${environment.appearance}.svg`;
  //return `https://assets.nhle.com/logos/nhl/svg/${abbrev}_${environment.appearance}.svg`;
}

export function starsOfTheGame(game: Game) {
  const stars = game.summary?.threeStars;

  if (!stars?.length) return "";

  let starsContent = `## ${playerTitleStrings.starsOfTheGame[languageKey]} \n`;
  starsContent += `| ${playerTitleStrings.photo[languageKey]} | ${playerTitleStrings.info[languageKey]} | ${playerTitleStrings.stats[languageKey]} | \n`;
  starsContent += `| :---: | --- | --- | \n`;
  stars.forEach((star: PlayerOnIce) => {
    const playerName = typeof star.name === "string" ? star.name : (star.name?.default ?? "");
    if (star.position === "G") {
      starsContent += `| &nbsp;<img alt="${star.teamAbbrev}'s ${playerName} ${playerTitleStrings.stats[languageKey]}" src="${star.headshot}" width="90" height="90" /> | ${star.teamAbbrev} • ${playerName} • ${star.sweaterNo} • ${star.position} | GAA: ${star.goalsAgainstAverage ? star.goalsAgainstAverage.toFixed(2) : ""} SV%: ${star.savePctg ? (star.savePctg * 100).toFixed(1) : "N/A"}% | \n`;
    } else {
      starsContent += `| &nbsp;<img alt="${star.teamAbbrev}'s ${playerName} ${playerTitleStrings.stats[languageKey]}" src="${star.headshot}" width="90" height="90" /> | ${star.teamAbbrev} • ${playerName} • ${star.sweaterNo} • ${star.position} | G: ${star.goals} A: ${star.assists} P: ${star.points} | \n`;
    }
  });

  return starsContent;
}

export function last10Record(gameSidebar: GamecenterRightRailResponse, awayTeam: TeamInfo, homeTeam: TeamInfo) {
  const record = gameSidebar.last10Record;

  function gameOutcome(gameResult: string) {
    switch (gameResult) {
      case "W":
        return "✅";
      case "L":
        return "❌";
      case "OTL":
        return "⭕";
      case "SOL":
        return "⭕";
      case "OTW":
        return "✅";
      case "SOW":
        return "✅";
      default:
        return "";
    }
  }

  let last10 =
    `## Last 10 Games` +
    `\n ### ${teamName(awayTeam, 0, false).trim()}: ${record.awayTeam.record}, ${record.awayTeam.streakType}${record.awayTeam.streak} \n\n`;
  record.awayTeam.pastGameResults.forEach((game) => {
    last10 += ` \`${game.opponentAbbrev} ${gameOutcome(game.gameResult)}\``;
  });
  last10 += `\n`;
  last10 += `\n ### ${teamName(homeTeam, 0, false).trim()}: ${record.homeTeam.record}, ${record.homeTeam.streakType}${record.homeTeam.streak} \n\n`;
  record.homeTeam.pastGameResults.forEach((game) => {
    last10 += ` \`${game.opponentAbbrev} ${gameOutcome(game.gameResult)}\``;
  });

  return last10;
}

export function generateLineScoreTable(
  linescore: Linescore | undefined,
  awayTeam: TeamInfo,
  homeTeam: TeamInfo,
): string {
  if (!linescore) return "";

  let lineScore = "|   "; // Empty cell for team names column

  // heading
  linescore.byPeriod.forEach((period, index) => {
    lineScore += `| ${index + 1} `;
  });
  lineScore += "| T |\n"; // Total column

  // separator line - make sure there's the correct number of columns
  lineScore += "|:---|"; // First column alignment
  linescore.byPeriod.forEach(() => {
    lineScore += ":---:|"; // Center alignment for period columns
  });
  lineScore += ":---:|"; // Center alignment for total column
  lineScore += "\n";

  // away team
  lineScore += `| ${teamName(awayTeam, undefined, true)} | `;
  linescore.byPeriod.forEach((period) => {
    lineScore += `${period.away} | `;
  });
  lineScore += `${linescore.totals.away} |\n`;

  // home team
  lineScore += `| ${teamName(homeTeam, undefined, true)} | `;
  linescore.byPeriod.forEach((period) => {
    lineScore += `${period.home} | `;
  });
  lineScore += `${linescore.totals.home} |\n`;

  return lineScore;
}

export function generateShotsTable(shots: Period[] | undefined, awayTeam: TeamInfo, homeTeam: TeamInfo): string {
  if (!shots) return "";

  let shotsTable = "|   "; // Empty cell for team names column
  let awayShotsTotal = 0;
  let homeShotsTotal = 0;

  // heading
  shots.forEach((period, index) => {
    shotsTable += `| ${index + 1} `;
  });
  shotsTable += "| T |\n"; // Total column

  // separator line - make sure there's the correct number of columns
  shotsTable += "|:---|";
  shots.forEach(() => {
    shotsTable += ":---:|";
  });
  shotsTable += ":---:|";
  shotsTable += "\n";

  // away team
  shotsTable += `| ${teamName(awayTeam, undefined, true)} | `;
  shots.forEach((period) => {
    shotsTable += `${period.away} | `;
    awayShotsTotal += period.away;
  });
  shotsTable += `${awayShotsTotal} |\n`;

  // home team
  shotsTable += `| ${teamName(homeTeam, undefined, true)} | `;
  shots.forEach((period) => {
    shotsTable += `${period.home} | `;
    homeShotsTotal += period.home;
  });
  shotsTable += `${homeShotsTotal} |\n`;

  return shotsTable;
}

export function teamName(team: TeamInfo, score: number | undefined, showLogo: boolean): string {
  return `${team.abbrev} ${team.commonName ? team.commonName[languageKey] : team.name[languageKey]} ${showLogo ? `<img alt="${team.commonName ? team.commonName[languageKey] : team.name[languageKey]}" src="${team.logo}" height="20" width="20" />` + "" : ""} ${score ? "(" + score + ")" : ""}`;
}

export function timeRemaining(clock: Clock | undefined, periodDescriptor: PeriodDescriptor | undefined): string {
  let timeMarkdown = getOrdinalPeriod(periodDescriptor?.number);

  if (clock?.inIntermission) {
    timeMarkdown += ` ${timeStrings.intermission[languageKey]}: ${timeStrings.timeRemaining[languageKey]} ${clock?.timeRemaining}`;
  } else {
    timeMarkdown += `: ${timeStrings.timeRemaining[languageKey]}: ${clock?.timeRemaining}`;
  }

  return timeMarkdown;
}

export function getOrdinalPeriod(num: number | undefined): string {
  if (num === undefined) return "";

  if (num < 1 || num > 9) return `Period ${num}`;

  const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
  return `${ordinals[num - 1]} Period`;
}

export function formatLocalTime(time: string): string {
  const preferences = getPreferenceValues<Timezone>();
  const userTimezone = preferences.timezone;

  const fullUTCString = time.includes("T") ? time : `${time}T00:00:00Z`;

  const utcDate = new Date(fullUTCString);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday(utcDate)) {
    return timeFormatter.format(utcDate);
  } else {
    const formattedDateTime = dateTimeFormatter.format(utcDate);
    // Convert MM/DD/YYYY to YYYY-MM-DD
    return formattedDateTime;
  }
}

export function getScoreColor(game: Game, team: "Home" | "Away"): Color.Green | undefined {
  if (typeof game.homeTeam.score !== "number" || typeof game.awayTeam.score !== "number") {
    return undefined;
  }

  const homeScore = game.homeTeam.score;
  const awayScore = game.awayTeam.score;

  if (team === "Home" && homeScore > awayScore) return Color.Green;
  if (team === "Away" && awayScore > homeScore) return Color.Green;

  return undefined;
}

export function getLanguageKey() {
  //const language = preferences.language as "default" | "fr";
  //const languageKey = language === "fr" ? "fr" : "default";
  //return languageKey;
  // Raycast does not support i18n yet, so we'll just return the default language for now
  return "default" as "default" | "fr";
}

export function formatSeason(season: number): string {
  const seasonStr = season.toString();
  return `${seasonStr.slice(2, 4)}-${seasonStr.slice(6, 8)}`;
}

export function formatPercentage(value: number | undefined): string {
  if (!value) return "-";
  return `${(value * 100).toFixed(2)}%`;
}
