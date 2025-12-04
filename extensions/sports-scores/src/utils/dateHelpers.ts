/**
 * Date utility functions for schedule navigation
 */

import { format, parse, addDays, subDays, startOfWeek, getYear } from 'date-fns';

/**
 * Formats a Date object to ESPN API format (YYYYMMDD)
 */
export function formatDateForAPI(date: Date): string {
  return format(date, 'yyyyMMdd');
}

/**
 * Parses ESPN API date string (YYYYMMDD) back to Date
 */
export function parseAPIDate(dateString: string): Date {
  return parse(dateString, 'yyyyMMdd', new Date());
}

/**
 * Returns user-friendly date display
 * Returns "Today", "Yesterday", "Tomorrow", or "Mon 10/15"
 */
export function getDateDisplay(date: Date): string {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const tomorrow = addDays(today, 1);

  if (format(date, 'yyyyMMdd') === format(today, 'yyyyMMdd')) {
    return 'Today';
  }
  if (format(date, 'yyyyMMdd') === format(yesterday, 'yyyyMMdd')) {
    return 'Yesterday';
  }
  if (format(date, 'yyyyMMdd') === format(tomorrow, 'yyyyMMdd')) {
    return 'Tomorrow';
  }

  return format(date, 'EEE M/d');
}

/**
 * Returns array of dates for the current week (Sun-Sat)
 */
export function getWeekDates(referenceDate: Date = new Date()): Date[] {
  const start = startOfWeek(referenceDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Returns preset date options for dropdown
 */
export function getDatePresets(): Array<{ label: string; value: string }> {
  const today = new Date();
  const presets = [
    { label: 'Today', value: formatDateForAPI(today) },
    { label: 'Yesterday', value: formatDateForAPI(subDays(today, 1)) },
    { label: 'Tomorrow', value: formatDateForAPI(addDays(today, 1)) },
  ];

  // Add this week's dates
  const weekDates = getWeekDates(today);
  const weekPresets = weekDates.map((date) => ({
    label: format(date, 'EEEE M/d'),
    value: formatDateForAPI(date),
  }));

  return [...presets, ...weekPresets];
}

/**
 * NFL season types
 */
export enum NFLSeasonType {
  Preseason = 1,
  RegularSeason = 2,
  Postseason = 3,
}

/**
 * Returns NFL week options for dropdown
 */
export function getNFLWeeks(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _season: number = getYear(new Date()),
): Array<{
  week: number;
  seasonType: NFLSeasonType;
  label: string;
  value: string;
}> {
  const weeks = [];

  // Regular season weeks 1-18
  for (let i = 1; i <= 18; i++) {
    weeks.push({
      week: i,
      seasonType: NFLSeasonType.RegularSeason,
      label: `Week ${i}`,
      value: `${i}-${NFLSeasonType.RegularSeason}`,
    });
  }

  // Postseason
  weeks.push(
    {
      week: 1,
      seasonType: NFLSeasonType.Postseason,
      label: 'Wild Card',
      value: `1-${NFLSeasonType.Postseason}`,
    },
    {
      week: 2,
      seasonType: NFLSeasonType.Postseason,
      label: 'Divisional',
      value: `2-${NFLSeasonType.Postseason}`,
    },
    {
      week: 3,
      seasonType: NFLSeasonType.Postseason,
      label: 'Conference',
      value: `3-${NFLSeasonType.Postseason}`,
    },
    {
      week: 4,
      seasonType: NFLSeasonType.Postseason,
      label: 'Super Bowl',
      value: `4-${NFLSeasonType.Postseason}`,
    },
  );

  return weeks;
}

/**
 * Calculates the current NFL week based on today's date
 * Note: This is approximate - ESPN API responses include the actual week number
 */
export function getCurrentNFLWeek(): {
  week: number;
  seasonType: NFLSeasonType;
  season: number;
} | null {
  const now = new Date();
  const year = getYear(now);
  const month = now.getMonth(); // 0-11

  // NFL season typically runs September (month 8) through February (month 1)
  // If Jan-July, use previous year's season
  const season = month < 8 ? year - 1 : year;

  // Approximate season start (first Thursday of September)
  const septemberFirst = new Date(season, 8, 1); // September 1
  const firstThursday = new Date(septemberFirst);
  const dayOfWeek = septemberFirst.getDay();
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  firstThursday.setDate(septemberFirst.getDate() + daysUntilThursday);

  // Calculate weeks since season start
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceStart = Math.floor((now.getTime() - firstThursday.getTime()) / msPerWeek);

  // Regular season is weeks 1-18
  if (weeksSinceStart >= 0 && weeksSinceStart < 18) {
    return {
      week: weeksSinceStart + 1,
      seasonType: NFLSeasonType.RegularSeason,
      season,
    };
  }

  // Postseason is weeks 19-22 (mapped to playoff weeks 1-4)
  if (weeksSinceStart >= 18 && weeksSinceStart < 23) {
    return {
      week: weeksSinceStart - 17,
      seasonType: NFLSeasonType.Postseason,
      season,
    };
  }

  // Outside of season
  return null;
}

/**
 * Calculates the current CFB week based on today's date
 * CFB season starts earlier than NFL (late August vs early September)
 */
export function getCurrentCFBWeek(): {
  week: number;
  seasonType: NFLSeasonType;
  season: number;
} | null {
  const now = new Date();
  const year = getYear(now);
  const month = now.getMonth(); // 0-11

  // CFB season typically runs August (month 7) through January (month 0)
  // If Jan-July, use previous year's season
  const season = month < 7 ? year - 1 : year;

  // CFB typically starts last Saturday of August
  const daysInAugust = new Date(season, 8, 0).getDate(); // Days in August

  // Find last Saturday of August
  let seasonStart = new Date(season, 7, daysInAugust);
  while (seasonStart.getDay() !== 6) {
    // 6 = Saturday
    seasonStart = subDays(seasonStart, 1);
  }

  // Calculate weeks since season start
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / msPerWeek);

  // CFB regular season is weeks 1-15, plus postseason weeks 16-19
  if (weeksSinceStart >= 0 && weeksSinceStart < 19) {
    return {
      week: weeksSinceStart + 1,
      seasonType: NFLSeasonType.RegularSeason, // CFB uses same type for all weeks
      season,
    };
  }

  // Outside of season
  return null;
}

/**
 * Gets date range for a given NFL week
 */
export function getWeekDateRange(
  season: number,
  week: number,
  seasonType: NFLSeasonType,
): { start: Date; end: Date } {
  // Approximate season start (first Thursday of September)
  const septemberFirst = new Date(season, 8, 1);
  const firstThursday = new Date(septemberFirst);
  const dayOfWeek = septemberFirst.getDay();
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  firstThursday.setDate(septemberFirst.getDate() + daysUntilThursday);

  let weekOffset = 0;
  if (seasonType === NFLSeasonType.RegularSeason) {
    weekOffset = week - 1;
  } else if (seasonType === NFLSeasonType.Postseason) {
    weekOffset = 18 + (week - 1);
  }

  const start = addDays(firstThursday, weekOffset * 7);
  const end = addDays(start, 6);

  return { start, end };
}
