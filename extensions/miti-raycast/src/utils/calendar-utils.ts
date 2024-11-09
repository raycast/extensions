// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import utd from "unicode-text-decorator";
import NepaliDate from "nepali-datetime";
import { largeCalendar, WeekStart, weekStart } from "../types/preferences";
import { captureException } from "@raycast/api";

const calThinSpace = replaceWithThinSpace(" ");
const calFourPerEmSpaceDivider = replaceWithFourPerEmSpace(" ");

const CalTitleStartPadding = largeCalendar
  ? calThinSpace.repeat(7) + calFourPerEmSpaceDivider.repeat(1)
  : calThinSpace.repeat(5) + calFourPerEmSpaceDivider.repeat(4);
const CalTitleSpace = largeCalendar
  ? calThinSpace.repeat(4) + calThinSpace.repeat(5) + calFourPerEmSpaceDivider
  : calThinSpace.repeat(5) + calFourPerEmSpaceDivider;
const CalDayStartPadding = calThinSpace.repeat(3) + calFourPerEmSpaceDivider.repeat(2);
const CalDaySpace = largeCalendar
  ? calThinSpace.repeat(4) + calThinSpace.repeat(4) + calFourPerEmSpaceDivider.repeat(2)
  : calThinSpace.repeat(4) + calFourPerEmSpaceDivider.repeat(2);

const zeroReplaceSpace = largeCalendar
  ? calThinSpace.repeat(8) + calFourPerEmSpaceDivider.repeat(0)
  : calThinSpace.repeat(6) + calFourPerEmSpaceDivider.repeat(1);

// Current date
const getCurDate = (date: Date = new Date()) => {
  return {
    curYear: date.getFullYear(),
    curMonth: date.getMonth(),
    curDay: date.getDate(),
  };
};
export const { curYear, curMonth, curDay } = getCurDate();

const getCurNepaliDate = () => {
  const today = new NepaliDate();
  return {
    nepaliYear: today.getYear(),
    nepaliMonth: today.getMonth(),
    nepaliDay: today.getDate(),
  };
};
export const { nepaliYear, nepaliMonth, nepaliDay } = getCurNepaliDate();

// Menubar title: Sat Jun 15
export const calMenubarTitle = getCalMenubarTitle();

function getCalMenubarTitle(): string {
  try {
    return new NepaliDate().formatNepali("YYYY MMMM DD");
  } catch (e) {
    captureException(e);
    console.error(e);
    return "Calendar";
  }
}

// Calendar date title: Sat Jun 15 2024

export function getCalDateTitle(): string {
  return `       \u2009${new NepaliDate().formatNepali("YYYY MMMM DD dddd")}`;
}

// Calendar week title: आ सो मं बु बि शु श
export const calTitles = () => {
  const calTitle =
    weekStart === WeekStart.SUNDAY
      ? [
          "\u2009आ\u2009",
          "\u2009सो\u2009",
          "\u2009मं\u2009\u2009",
          "\u2009बु\u2009\u2009",
          "\u2009बि\u2009",
          "\u2009शु\u2009",
          "\u2009\u2009श\u2009",
        ]
      : [
          "\u2009सो\u2009",
          "\u2009मं\u2009\u2009",
          "\u2009बु\u2009\u2009",
          "\u2009बि\u2009",
          "\u2009शु\u2009",
          "\u2009\u2009श\u2009",
          "\u2009आ\u2009",
        ];
  return calTitle;
};

export const calWeekTitle = () => {
  return utd.decorate(calTitles().join(CalTitleSpace), "sans_serif");
};

function isValidNepaliDate(year: number, month: number): boolean {
  return year >= 2080 && year <= 2084 && month >= 1 && month <= 12;
}

// Replace the getDaysInMonth function
function getDaysInMonth(year: number, month: number): number {
  try {
    if (!isValidNepaliDate(year, month)) {
      throw new Error(`Invalid Nepali date: year=${year}, month=${month}`);
    }

    // Create date objects for current month's first day and next month's first day
    const currentMonthStart = new NepaliDate(year, month, 1);
    const nextMonthStart = new NepaliDate(year, month + 1, 1);

    // Get the difference in days
    const diffTime = nextMonthStart.getTime() - currentMonthStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (e) {
    captureException(e);
    console.error("Error getting days in month:", e);
    return 30; // fallback to 30 days
  }
}

// Helper function to get first day of month (0 = Sunday, 1 = Monday, etc.)
function getFirstDayOfMonth(year: number, month: number): number {
  const npDate = new NepaliDate(year, month - 1, 1);
  const enDate = npDate.getDateObject();
  return enDate.getDay();
}

// Replace the calFirstColumn function
export const calFirstColumn = (year: number = nepaliYear, month: number = nepaliMonth) => {
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const weeks: number[] = [];

  let dayCounter = 1;
  let weekStart = 1;

  // Adjust for week start preference
  const startOffset = (7 + firstDay - Number(weekStart)) % 7;

  while (dayCounter <= daysInMonth) {
    if (dayCounter === 1) {
      weeks.push(weekStart);
    } else if ((dayCounter + startOffset - 1) % 7 === 0) {
      weekStart++;
      weeks.push(weekStart);
    }
    dayCounter++;
  }

  return weeks;
};

// Update the calData function to handle 1-based months
export const calData = (year: number = nepaliYear, month: number = nepaliMonth + 1) => {
  try {
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const calendar: number[][] = [];

    // Adjust for week start preference
    const startOffset = (7 + firstDay - Number(weekStart)) % 7;

    let day = 1;
    for (let week = 0; week < 6; week++) {
      const weekDays: number[] = [];
      for (let i = 0; i < 7; i++) {
        if (week === 0 && i < startOffset) {
          weekDays.push(0);
        } else if (day > daysInMonth) {
          weekDays.push(0);
        } else {
          weekDays.push(day);
          day++;
        }
      }
      calendar.push(weekDays);
      if (day > daysInMonth && week >= 4) break;
    }

    return formatArray(calendar);
  } catch (e) {
    captureException(e);
    console.error(e);
    return [];
  }
};

function formatArray(input: number[][]) {
  return input.map((row, index) => {
    const zeroCount = row.filter((item) => item === 0).length;
    const formattedRow = row.map((item) => {
      if (item === 0) {
        return zeroReplaceSpace;
      } else {
        let itemStr = item.toString();
        // format day string
        if (item === nepaliDay) {
          itemStr = replaceWithBoldSansSerif(itemStr);
        } else {
          itemStr = replaceWithSansSerif(itemStr);
        }

        // add space before single digit
        if (item < 10) {
          if (item === 1) {
            itemStr = calFourPerEmSpaceDivider.repeat(1) + itemStr;
          } else {
            itemStr = calThinSpace.repeat(0) + calFourPerEmSpaceDivider.repeat(2) + itemStr;
          }
        }
        return itemStr;
      }
    });

    // final formatted calendar row
    let finalRow: string;
    finalRow = formattedRow.join(CalDaySpace);

    if (zeroCount <= 1 && index === 0) {
      finalRow = calThinSpace.repeat(1) + finalRow;
    } else if (zeroCount >= 5 && index === 0) {
      finalRow = finalRow.replace(calThinSpace.repeat(1), "");
    }
    return finalRow;
  });
}

export function replaceWithSansSerif(input: string): string {
  return utd.decorate(input, "sans_serif");
}

function addUnderlineToDigits(input: string): string {
  return input.replace(/\d/g, (match) => match + "\u0332");
}
export function replaceWithBoldSansSerif(input: string): string {
  return utd.decorate(addUnderlineToDigits(input), "bold_sans_serif");
}

export function replaceWithFourPerEmSpace(input: string): string {
  const fourPerEmSpace = "\u2005";
  return input.replace(/\s/g, fourPerEmSpace);
}

function replaceWithThinSpace(input: string): string {
  const thirdEmSpace = "\u2009";
  return input.replace(/\s/g, thirdEmSpace);
}
