/**
 * Sport-specific helper functions for GameDetail component
 */

import { Icon, Color } from '@raycast/api';

/**
 * Returns period labels for linescore display based on sport type
 * @param sport - Sport type (basketball, football, hockey, baseball, soccer)
 * @param numPeriods - Number of periods in the game
 * @returns Array of period labels
 */
export function getPeriodLabels(sport: string, numPeriods: number): string[] {
  if (numPeriods === 0) return [];

  // Baseball uses numbered innings
  if (sport === 'baseball') {
    return Array.from({ length: numPeriods }, (_, i) => String(i + 1));
  }

  // Soccer uses halves
  if (sport === 'soccer') {
    const labels: string[] = [];
    for (let i = 0; i < numPeriods; i++) {
      if (i === 0) labels.push('1H');
      else if (i === 1) labels.push('2H');
      else labels.push('ET'); // Extra time
    }
    return labels;
  }

  // Hockey uses ordinal periods
  if (sport === 'hockey') {
    const labels: string[] = [];
    for (let i = 0; i < numPeriods; i++) {
      if (i === 0) labels.push('1st');
      else if (i === 1) labels.push('2nd');
      else if (i === 2) labels.push('3rd');
      else labels.push('OT'); // Overtime
    }
    return labels;
  }

  // Basketball and Football use quarters (Q1, Q2, Q3, Q4)
  if (sport === 'basketball' || sport === 'football') {
    const labels: string[] = [];
    for (let i = 0; i < numPeriods; i++) {
      if (i < 4) {
        labels.push(`Q${i + 1}`);
      } else {
        // Overtime periods
        labels.push(i === 4 ? 'OT' : `OT${i - 3}`);
      }
    }
    return labels;
  }

  // Default: numbered periods
  return Array.from({ length: numPeriods }, (_, i) => String(i + 1));
}

/**
 * Returns the header text for linescore table based on sport
 * @param sport - Sport type
 * @returns Header text (e.g., "Scoring by Quarter")
 */
export function getLinescoreHeader(sport: string): string {
  if (sport === 'baseball') return 'Scoring by Inning';
  if (sport === 'soccer') return 'Scoring by Half';
  if (sport === 'hockey') return 'Scoring by Period';
  return 'Scoring by Quarter';
}

/**
 * Returns the default leader categories for a sport (in priority order)
 * @param sport - Sport type
 * @returns Array of category names
 */
export function getDefaultLeaderCategories(sport: string): string[] {
  if (sport === 'basketball') {
    return ['points', 'rebounds', 'assists'];
  }
  if (sport === 'football') {
    return ['passingYards', 'rushingYards', 'receivingYards'];
  }
  if (sport === 'baseball') {
    return ['hits', 'rbi', 'strikeouts'];
  }
  if (sport === 'hockey') {
    return ['goals', 'assists', 'saves'];
  }
  if (sport === 'soccer') {
    return ['goals', 'assists', 'shots'];
  }
  return [];
}

/**
 * Returns the betting spread terminology for a sport
 * @param sport - Sport type
 * @returns Spread label (e.g., "Spread", "Puck Line", "Run Line")
 */
export function getSpreadLabel(sport: string): string {
  if (sport === 'hockey') return 'Puck Line';
  if (sport === 'baseball') return 'Run Line';
  return 'Spread';
}

/**
 * Returns the Raycast icon for a given sport
 * @param sport - Sport type (basketball, football, hockey, baseball, soccer)
 * @returns Appropriate Raycast Icon
 */
export function getSportIcon(sport: string): Icon {
  switch (sport) {
    case 'basketball':
      return Icon.Circle;
    case 'football':
      return Icon.CircleFilled;
    case 'baseball':
      return Icon.Dot;
    case 'hockey':
      return Icon.Circle;
    case 'soccer':
      return Icon.CircleProgress;
    default:
      return Icon.Circle;
  }
}

/**
 * Returns the status icon based on game state
 * @param state - Game state ('pre' | 'in' | 'post')
 * @returns Appropriate Raycast Icon
 */
export function getStatusIcon(state: 'pre' | 'in' | 'post'): Icon {
  switch (state) {
    case 'pre':
      return Icon.Clock;
    case 'in':
      return Icon.CircleFilled;
    case 'post':
      return Icon.CheckCircle;
    default:
      return Icon.Clock;
  }
}

/**
 * Returns the status color based on game state
 * @param state - Game state ('pre' | 'in' | 'post')
 * @returns Appropriate Raycast Color
 */
export function getStatusColor(state: 'pre' | 'in' | 'post'): Color {
  switch (state) {
    case 'pre':
      return Color.Orange;
    case 'in':
      return Color.Green;
    case 'post':
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
}

/**
 * Returns the display text for game status
 * @param state - Game state ('pre' | 'in' | 'post')
 * @param shortDetail - Short detail string from ESPN
 * @returns Display text for status
 */
export function getStatusDisplayText(state: 'pre' | 'in' | 'post', shortDetail: string): string {
  switch (state) {
    case 'post':
      return 'Final';
    case 'in':
      return shortDetail; // e.g., "4th 2:00"
    case 'pre':
      return shortDetail; // e.g., "Today at 8:00 PM"
    default:
      return shortDetail;
  }
}

/**
 * Returns the indices of priority columns for box score display
 * Limits box score to 5 most important columns per sport
 * @param sport - Sport type
 * @param allLabels - All available column labels from API
 * @param categoryName - Optional category name for football-specific priorities
 * @returns Array of indices to show (max 5)
 */
export function getPriorityBoxScoreColumns(
  sport: string,
  allLabels: string[],
  categoryName?: string,
): number[] {
  // If fewer than 5 columns total, return all indices
  if (allLabels.length <= 5) {
    return allLabels.map((_, i) => i);
  }

  // Define priority column names per sport
  const priorityColumns: { [key: string]: { [category: string]: string[] } | string[] } = {
    basketball: ['MIN', 'PTS', 'REB', 'AST', 'FG%'],
    baseball: ['AB', 'H', 'R', 'RBI', 'AVG'],
    hockey: ['G', 'A', 'PTS', '+/-', 'SOG'],
    soccer: ['G', 'A', 'SOG', 'FC', 'YC'],
    football: {
      passing: ['C/ATT', 'YDS', 'TD', 'INT', 'QBR'],
      rushing: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'],
      receiving: ['REC', 'YDS', 'AVG', 'TD', 'LONG'],
      defensive: ['TOT', 'SOLO', 'SACKS', 'TFL', 'INT'],
      kicking: ['FG', 'PCT', 'LONG', 'XP', 'PTS'],
      punting: ['NO', 'YDS', 'AVG', 'TB', 'In 20'],
    },
  };

  let priorityLabels: string[];

  // For football, use category-specific priorities if category name provided
  if (sport === 'football' && categoryName && typeof priorityColumns.football === 'object') {
    const footballPriorities = priorityColumns.football as { [category: string]: string[] };
    priorityLabels = footballPriorities[categoryName] || allLabels.slice(0, 5);
  } else {
    const sportPriorities = priorityColumns[sport];
    priorityLabels = Array.isArray(sportPriorities) ? sportPriorities : allLabels.slice(0, 5);
  }

  // Find indices of priority columns in allLabels
  const indices: number[] = [];
  for (const label of priorityLabels) {
    const index = allLabels.indexOf(label);
    if (index !== -1) {
      indices.push(index);
    }
  }

  // If we found fewer than 5 priority columns, fill with first available columns
  if (indices.length < 5) {
    for (let i = 0; i < allLabels.length && indices.length < 5; i++) {
      if (!indices.includes(i)) {
        indices.push(i);
      }
    }
  }

  return indices;
}

/**
 * Constructs ESPN game URL
 * @param sport - Sport type (unused, kept for consistency)
 * @param league - League abbreviation
 * @param gameId - Game ID from ESPN API
 * @returns Full ESPN URL for the game
 */
export function buildEspnGameUrl(sport: string, league: string, gameId: string): string {
  return `https://www.espn.com/${league}/game/_/gameId/${gameId}`;
}

/**
 * Determines if a sport is football (NFL/College Football)
 * Football requires special combined-team box score rendering
 * @param sport - Sport type
 * @returns True if sport is football
 */
export function isFootball(sport: string): boolean {
  return sport === 'football';
}

/**
 * Gets the stat categories to display for football
 * Returns categories in priority order
 * @returns Array of category objects with name, displayName, and priority
 */
export function getFootballStatCategories(): Array<{
  name: string;
  displayName: string;
  priority: number;
}> {
  return [
    { name: 'passing', displayName: 'Passing', priority: 1 },
    { name: 'rushing', displayName: 'Rushing', priority: 2 },
    { name: 'receiving', displayName: 'Receiving', priority: 3 },
    { name: 'defensive', displayName: 'Defense', priority: 4 },
    { name: 'interceptions', displayName: 'Interceptions', priority: 5 },
    { name: 'kicking', displayName: 'Kicking', priority: 6 },
    { name: 'punting', displayName: 'Punting', priority: 7 },
    { name: 'kickReturns', displayName: 'Kick Returns', priority: 8 },
    { name: 'puntReturns', displayName: 'Punt Returns', priority: 9 },
    { name: 'fumbles', displayName: 'Fumbles', priority: 10 },
  ];
}
