import {
  BsDate,
  getBsMonthDays,
  getBsDayOfWeek,
  BS_MONTH_NAMES,
  BS_MONTH_NAMES_NP,
} from "./nepali-date";
import { getHolidayOnDate } from "./holidays";

/**
 * Generates a premium SVG calendar for a given BS month.
 * Designed to look like the "Old Money" aesthetic in the user's screenshot.
 */
export function generateCalendarSvg(
  viewYear: number,
  viewMonth: number,
  today: BsDate,
  selectedDay?: number,
): string {
  const firstDayOfWeek = getBsDayOfWeek(viewYear, viewMonth, 1);
  const daysInMonth = getBsMonthDays(viewYear, viewMonth);

  // Previous month info
  let prevMonth = viewMonth - 1;
  let prevYear = viewYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear--;
  }
  // At the very start of the supported range there is no previous month to
  // measure. Those cells are greyed-out filler, so fall back to a nominal
  // length rather than letting the lookup throw mid-render.
  let daysInPrevMonth: number;
  try {
    daysInPrevMonth = getBsMonthDays(prevYear, prevMonth);
  } catch {
    daysInPrevMonth = 30;
  }

  const width = 640;
  const height = 480;
  const cellWidth = 72;
  const cellHeight = 52;
  const startX = 60;
  const startY = 140;

  // Premium Palette
  const bg = "#0d140d"; // Darker obsidian green
  const border = "#2d3a2d";
  const textPrimary = "#f0f0f0";
  const textSecondary = "#4a5a4a";
  const accentGold = "#d4af37"; // Classic gold
  const accentGoldDim = "#a68a2d";
  const accentRed = "#e63946";

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Definitions for gradients/filters
  svg += `<defs>
    <radialGradient id="todayGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" style="stop-color:${accentGold};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${accentGold};stop-opacity:0" />
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
      <feOffset dx="0" dy="2" result="offsetblur" />
      <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>`;

  // Background
  svg += `<rect width="${width}" height="${height}" rx="20" fill="${bg}" stroke="${border}" stroke-width="1" />`;

  // Navigation Indicators (Non-functional but matches aesthetic)
  svg += `<path d="M40 60 L30 70 L40 80" fill="none" stroke="${accentGoldDim}" stroke-width="2" />`;
  svg += `<path d="M600 60 L610 70 L600 80" fill="none" stroke="${accentGoldDim}" stroke-width="2" />`;

  // Header
  const monthName = BS_MONTH_NAMES[viewMonth - 1];
  const monthNameNp = BS_MONTH_NAMES_NP[viewMonth - 1];
  svg += `<text x="${width / 2}" y="70" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-weight="600" fill="${textPrimary}">${monthName} ${viewYear}</text>`;
  svg += `<text x="${width / 2}" y="100" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="16" fill="${accentGoldDim}" letter-spacing="2">${monthNameNp}</text>`;

  // Weekday Headers
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  weekDays.forEach((day, i) => {
    svg += `<text x="${startX + i * cellWidth + cellWidth / 2}" y="130" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="12" font-weight="800" fill="${accentGoldDim}" opacity="0.6">${day}</text>`;
  });

  // Grid
  let dayCounter = 1;
  let nextMonthDayCounter = 1;

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const x = startX + col * cellWidth + cellWidth / 2;
      const y = startY + row * cellHeight + cellHeight / 2;
      const index = row * 7 + col;

      if (index < firstDayOfWeek) {
        const day = daysInPrevMonth - (firstDayOfWeek - index - 1);
        svg += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="${textSecondary}" opacity="0.3">${day}</text>`;
      } else if (dayCounter <= daysInMonth) {
        const isToday =
          today.year === viewYear &&
          today.month === viewMonth &&
          today.day === dayCounter;
        const isSelected = selectedDay === dayCounter;
        const holiday = getHolidayOnDate({
          year: viewYear,
          month: viewMonth,
          day: dayCounter,
        });

        if (isToday) {
          svg += `<circle cx="${x}" cy="${y - 7}" r="22" fill="url(#todayGlow)" />`;
          svg += `<circle cx="${x}" cy="${y - 7}" r="20" fill="none" stroke="${accentGold}" stroke-width="1.5" />`;
        } else if (isSelected) {
          svg += `<circle cx="${x}" cy="${y - 7}" r="20" fill="none" stroke="${textSecondary}" stroke-width="1" stroke-dasharray="4" />`;
        }

        svg += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="${isToday ? "700" : "400"}" fill="${holiday ? accentGold : textPrimary}">${dayCounter}</text>`;

        if (holiday) {
          svg += `<circle cx="${x}" cy="${y + 10}" r="2.5" fill="${accentRed}" />`;
        }

        dayCounter++;
      } else {
        svg += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="${textSecondary}" opacity="0.3">${nextMonthDayCounter++}</text>`;
      }
    }
  }

  svg += `</svg>`;
  const base64 = Buffer.from(svg).toString("base64");
  return `![Calendar](data:image/svg+xml;base64,${base64})`;
}
