/**
 * Data formatting utilities for GameDetail component
 */

import type { Pickcenter } from '../types';

/**
 * Formats player stat for display with abbreviated name
 * @param athlete - Athlete object with fullName
 * @param displayValue - Stat value to display
 * @returns Formatted string like "J. Smith (25)" or just the value if no athlete
 */
export function formatPlayerStat(
  athlete: { fullName: string } | undefined,
  displayValue: string,
): string {
  if (!athlete) return displayValue;

  // Abbreviate first name to initial
  const names = athlete.fullName.split(' ');
  if (names.length === 1) return `${athlete.fullName} (${displayValue})`;

  const firstName = names[0];
  const lastName = names.slice(1).join(' ');
  const abbreviated = `${firstName.charAt(0)}. ${lastName}`;

  return `${abbreviated} (${displayValue})`;
}

/**
 * Formats team record from records array
 * @param records - Array of record objects with summary
 * @returns Formatted record string like "10-5" or "0-0" if not available
 */
export function formatRecord(records: { summary: string }[] | undefined): string {
  if (!records || records.length === 0) return '0-0';
  return records[0].summary;
}

/**
 * Parses and formats betting odds from pickcenter data
 * @param pickcenter - Array of pickcenter objects from ESPN
 * @param homeAbbrev - Home team abbreviation
 * @param awayAbbrev - Away team abbreviation
 * @returns Structured betting odds or null if not available
 */
export function formatBettingOdds(
  pickcenter: Pickcenter[] | undefined,
  homeAbbrev: string,
  awayAbbrev: string,
): {
  spread: { away: string; home: string };
  moneyline?: { away: string; home: string };
  overUnder: string;
} | null {
  if (!pickcenter || pickcenter.length === 0) return null;

  const odds = pickcenter[0];
  if (!odds.details) return null;

  // Parse the details string (e.g., "BUF -2.5")
  const spreadMatch = odds.details.match(/([\w]+)\s+([-+]?\d+\.?\d*)/);
  if (!spreadMatch) return null;

  const favoredTeam = spreadMatch[1];
  const spreadValue = parseFloat(spreadMatch[2]);

  // Validate that favoredTeam matches one of our teams
  if (favoredTeam !== homeAbbrev && favoredTeam !== awayAbbrev) {
    return null;
  }

  // Determine which team is home/away and format spreads
  const isHomeTeamFavored = favoredTeam === homeAbbrev;
  const homeSpread = isHomeTeamFavored ? spreadValue.toFixed(1) : (+spreadValue * -1).toFixed(1);
  const awaySpread = isHomeTeamFavored ? (+spreadValue * -1).toFixed(1) : spreadValue.toFixed(1);

  // Format with +/- signs
  const formattedHomeSpread = Number(homeSpread) >= 0 ? `+${homeSpread}` : homeSpread;
  const formattedAwaySpread = Number(awaySpread) >= 0 ? `+${awaySpread}` : awaySpread;

  return {
    spread: {
      away: formattedAwaySpread,
      home: formattedHomeSpread,
    },
    overUnder: odds.overUnder?.toString() || '',
  };
}

/**
 * Returns top N items from array
 * @param items - Array of items
 * @param max - Maximum number to return
 * @returns Sliced array
 */
export function getTopItems<T>(items: T[] | undefined, max: number): T[] {
  if (!items) return [];
  return items.slice(0, max);
}

/**
 * Formats a stat value with proper units
 * @param value - The stat value
 * @param label - The stat label
 * @returns Formatted value
 */
export function formatStatValue(value: string | number, label?: string): string {
  if (typeof value === 'number') {
    // Format percentages
    if (label?.includes('%')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toString();
  }
  return value;
}

/**
 * Abbreviates a player's first name to initial
 * @param fullName - Player's full name
 * @returns Abbreviated name like "J. Smith"
 */
export function abbreviateName(fullName: string): string {
  const names = fullName.split(' ');
  if (names.length === 1) return fullName;

  const firstName = names[0];
  const lastName = names.slice(1).join(' ');
  return `${firstName.charAt(0)}. ${lastName}`;
}
