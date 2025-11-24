/**
 * Box score rendering utilities for different sports
 */

import { Competitor } from '../types';
import { getPriorityBoxScoreColumns, getFootballStatCategories } from './sportHelpers';
import { getTeamLogoMarkdown } from './imageHelpers';

interface TeamBoxScoreData {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo?: string;
  };
  statistics: {
    name?: string;
    displayName?: string;
    athletes: {
      athlete: {
        displayName: string;
        position?: { abbreviation: string };
      };
      stats: string[];
    }[];
    names: string[];
    labels: string[];
  }[];
}

/**
 * Renders football box score with combined-team tables per stat category
 * Format:
 * ### Passing
 * | Team | Player | C/ATT | YDS | TD | INT | QBR |
 * | ---- | ------ | ----- | --- | -- | --- | --- |
 * | **BUF** | J. Allen | 20/30 | 250 | 2 | 0 | 95.3 |
 * | **KC**  | P. Mahomes | 18/25 | 200 | 1 | 0 | 88.7 |
 */
export function renderFootballBoxScore(
  playersData: TeamBoxScoreData[],
  homeTeam: Competitor,
  awayTeam: Competitor,
): string {
  let markdown = '';

  const footballCategories = getFootballStatCategories();

  // Process each stat category
  footballCategories.forEach((category) => {
    // Collect players by team for this category
    const awayTeamPlayers: Array<{ athlete: { displayName: string }; stats: string[] }> = [];
    const homeTeamPlayers: Array<{ athlete: { displayName: string }; stats: string[] }> = [];
    let categoryLabels: string[] = [];

    playersData.forEach((teamData) => {
      const categoryStats = teamData.statistics.find((stat) => stat.name === category.name);

      if (categoryStats && categoryStats.athletes.length > 0) {
        categoryLabels = categoryStats.labels;
        const isHomeTeam = teamData.team.id === homeTeam.team.id;

        categoryStats.athletes.forEach((athleteEntry) => {
          if (isHomeTeam) {
            homeTeamPlayers.push({
              athlete: athleteEntry.athlete,
              stats: athleteEntry.stats,
            });
          } else {
            awayTeamPlayers.push({
              athlete: athleteEntry.athlete,
              stats: athleteEntry.stats,
            });
          }
        });
      }
    });

    // Skip empty categories
    if (awayTeamPlayers.length === 0 && homeTeamPlayers.length === 0) return;

    // Get priority columns (limit to 5 stats)
    const priorityIndices = getPriorityBoxScoreColumns('football', categoryLabels, category.name);
    const priorityLabels = priorityIndices.map((i) => categoryLabels[i]);

    // Category header
    markdown += `### ${category.displayName}\n\n`;

    // Away team sub-table
    if (awayTeamPlayers.length > 0) {
      const awayLogo = getTeamLogoMarkdown(awayTeam.team, 16);
      markdown += `#### ${awayLogo} ${awayTeam.team.displayName}\n\n`;
      markdown += `| Player | ${priorityLabels.join(' | ')} |\n`;
      markdown += `| --- | ${priorityLabels.map(() => '---').join(' | ')} |\n`;

      awayTeamPlayers.forEach((player) => {
        const priorityStats = priorityIndices.map((i) => player.stats[i]);
        markdown += `| ${player.athlete.displayName} | ${priorityStats.join(' | ')} |\n`;
      });
      markdown += '\n';
    }

    // Home team sub-table
    if (homeTeamPlayers.length > 0) {
      const homeLogo = getTeamLogoMarkdown(homeTeam.team, 16);
      markdown += `#### ${homeLogo} ${homeTeam.team.displayName}\n\n`;
      markdown += `| Player | ${priorityLabels.join(' | ')} |\n`;
      markdown += `| --- | ${priorityLabels.map(() => '---').join(' | ')} |\n`;

      homeTeamPlayers.forEach((player) => {
        const priorityStats = priorityIndices.map((i) => player.stats[i]);
        markdown += `| ${player.athlete.displayName} | ${priorityStats.join(' | ')} |\n`;
      });
      markdown += '\n';
    }
  });

  return markdown;
}

/**
 * Renders standard box score with position column
 * Format:
 * ### Boston Celtics
 * | Player | Pos | MIN | PTS | REB | AST | FG% |
 * | ------ | --- | --- | --- | --- | --- | --- |
 * | J. Tatum | F | 35 | 28 | 8 | 5 | 52.3 |
 */
export function renderStandardBoxScore(
  playersData: TeamBoxScoreData[],
  sport: string,
  homeTeam: Competitor,
  awayTeam: Competitor,
): string {
  let markdown = '';

  // Process each team separately (away team first)
  const sortedTeams = playersData.sort((a, b) => {
    const aIsHome = a.team.id === homeTeam.team.id;
    const bIsHome = b.team.id === homeTeam.team.id;
    if (aIsHome === bIsHome) return 0;
    return aIsHome ? 1 : -1;
  });

  sortedTeams.forEach((teamData) => {
    const team = teamData.team.id === homeTeam.team.id ? homeTeam.team : awayTeam.team;

    // Add team header with logo
    const teamLogo = getTeamLogoMarkdown(team, 20);
    markdown += `### ${teamLogo} ${team.displayName}\n\n`;

    // Get first statistics category (most sports only have one)
    const playerStats = teamData.statistics[0];
    if (!playerStats) return;

    const allLabels = playerStats.labels;
    const priorityIndices = getPriorityBoxScoreColumns(sport, allLabels);
    const priorityLabels = priorityIndices.map((i) => allLabels[i]);

    // Build header with position column
    const headers = ['Player', 'Pos', ...priorityLabels];
    markdown += `| ${headers.join(' | ')} |\n`;
    markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;

    // Build rows with position data
    playerStats.athletes.forEach((athleteEntry) => {
      const position = athleteEntry.athlete.position?.abbreviation || '-';
      const priorityStats = priorityIndices.map((i) => athleteEntry.stats[i]);
      const row = [athleteEntry.athlete.displayName, position, ...priorityStats];
      markdown += `| ${row.join(' | ')} |\n`;
    });

    markdown += '\n';
  });

  return markdown;
}
