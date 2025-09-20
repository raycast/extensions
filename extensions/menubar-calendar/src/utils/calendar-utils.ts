// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import utd from "unicode-text-decorator";
import { Calendar } from "calendar";
import { largeCalendar, showWeekNumber, WeekStart, weekStart } from "../types/preferences";
import { captureException } from "@raycast/api";
import { formatMonthDateWithWeek, formatYearDateWithWeek } from "./common-utils";

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

// Menubar title: Sat Jun 15
export const calMenubarTitle = getCalMenubarTitle();

function getCalMenubarTitle(): string {
  try {
    return formatMonthDateWithWeek(new Date());
  } catch (e) {
    captureException(e);
    console.error(e);
    return "Calendar";
  }
}

// Calendar date title: Sat Jun 15 2024
export const calDateTitle = utd.decorate(getCalDateTitle(curYear, curMonth, curDay), "sans_serif");

function getCalDateTitle(year: number, month: number, day: number = 1): string {
  try {
    if (month < 0 || month > 11) {
      throw new Error("Invalid month. Month must be between 1 and 12.");
    }
    const date = new Date(year, month, day);
    return utd.decorate(formatYearDateWithWeek(date), "bold_sans_serif");
  } catch (e) {
    captureException(e);
    console.error(e);
    return new Date().toLocaleDateString();
  }
}

// Calendar week title: Su Mo Tu We Th Fr Sa
export const calTitles = () => {
  const calTitle =
    weekStart === WeekStart.SUNDAY
      ? ["Su", "Mo", "Tu", "We", "Th", "\u2009Fr", "Sa"]
      : ["Mo", "Tu", "We", "Th", "Fr", "\u2009Sa", "Su"];
  if (showWeekNumber) {
    calTitle.unshift(CalTitleStartPadding);
  }
  return calTitle;
};

export const calWeekTitle = () => {
  return utd.decorate(calTitles().join(CalTitleSpace), "sans_serif");
};

// Calendar first column: 1 2 3 4 5 6 7, for calendar week number
export const calFirstColumn = (year: number = curYear, month: number = curMonth) => {
  const cal = new Calendar(Number(weekStart));
  const calTable_ = cal.monthDays(year, month);
  return calTable_.map((row) => row[0]);
};

// Calendar data group by week, 6 rows and 7 columns
export const calData = (year: number = curYear, month: number = curMonth) => {
  try {
    const cal = new Calendar(Number(weekStart));
    const calTable_ = cal.monthDays(year, month);
    return formatArray(calTable_);
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
        if (item === curDay) {
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
    if (showWeekNumber) {
      finalRow = CalDayStartPadding + formattedRow.join(CalDaySpace);
    } else {
      finalRow = formattedRow.join(CalDaySpace);
    }
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
