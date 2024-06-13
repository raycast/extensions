// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import utd from "unicode-text-decorator";
import { Calendar } from "calendar";
import { showWeekNumber, WeekStart, weekStart } from "../types/preferences";
import { captureException } from "@raycast/api";

const calTitleDivider = replaceWithThinSpace(" ") + replaceWithFourPerEmSpace(" ");
const calSpaceDivider = replaceWithFourPerEmSpace("  ");
const calSingleNumber = replaceWithFourPerEmSpace("  ");
const calThinSpace = replaceWithThinSpace(" ");
const calTwoThinSpace = replaceWithThinSpace("  ");
const calSpace = " ";

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
    return macDateFormat();
  } catch (e) {
    captureException(e);
    console.error(e);
    return "Calendar";
  }
}

function macDateFormat() {
  const date = new Date();
  const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  const weekDayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  return calSpace + weekDayShort + calSpace + monthShort + calSpace + curDay;
}

// Calendar date title: Sat Jun 15 2024
export const calDateTitle = utd.decorate(getCalDateTitle(curYear, curMonth), "sans_serif");

function getCalDateTitle(year: number, month: number, day: number = 1): string {
  try {
    if (month < 0 || month > 11) {
      throw new Error("Invalid month. Month must be between 1 and 12.");
    }
    const date = new Date(year, month, day);
    const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
    const weekDayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date());
    return utd.decorate(
      weekDayShort + calSpaceDivider + monthShort + calSpaceDivider + curDay + calSpaceDivider + curYear,
      "bold_sans_serif",
    );
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
    calTitle.unshift(calTwoThinSpace + calTitleDivider + calTitleDivider + calThinSpace + calSpaceDivider);
  }
  return calTitle;
};

export const calWeekTitle = utd.decorate(
  calTitles().join(calThinSpace + calThinSpace + calTwoThinSpace + calTitleDivider),
  "sans_serif",
);

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
    const formattedArray_ = formatArray(calTable_);
    return joinRows(formattedArray_);
  } catch (e) {
    captureException(e);
    console.error(e);
    return [];
  }
};

function formatArray(input: number[][]): string[][] {
  return input.map((row) => {
    const formattedRow = row.map((item, index) => {
      if (item === 0) {
        return calThinSpace + calThinSpace + calTwoThinSpace + calSpaceDivider + calSpaceDivider;
      } else {
        let itemStr = item.toString();
        // format day string
        if (item === curDay) {
          itemStr = replaceWithBoldSansSerif(itemStr);
        } else {
          itemStr = replaceWithSansSerif(itemStr);
        }

        // add space between numbers
        if (item < 10) {
          if (item === 1) {
            itemStr = calThinSpace + itemStr;
          } else {
            itemStr = calSingleNumber + itemStr;
          }
        }
        if (index === 0) {
          return itemStr;
        } else {
          return calTwoThinSpace + calTwoThinSpace + itemStr;
        }
      }
    });

    if (showWeekNumber) {
      formattedRow.unshift(calSingleNumber);
    }

    return formattedRow;
  });
}

function joinRows(formattedArray: string[][]): string[] {
  return formattedArray.map((row) => row.join(calSpaceDivider));
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

function replaceWithFourPerEmSpace(input: string): string {
  const fourPerEmSpace = "\u2005";
  return input.replace(/\s/g, fourPerEmSpace);
}

function replaceWithThinSpace(input: string): string {
  const thirdEmSpace = "\u2009";
  return input.replace(/\s/g, thirdEmSpace);
}
