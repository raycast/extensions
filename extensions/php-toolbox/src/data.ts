import { format, getDaysInMonth, isLeapYear } from "date-fns";
import type { FavoriteItem } from "./favorites";

export const now = new Date();

function formatAndConvertToZeroIndex(date: Date, f: string, options?: object) {
  return String(parseInt(format(date, f, options)) - 1);
}

function getShortTimezone() {
  return now.toLocaleDateString(undefined, { day: "2-digit", timeZoneName: "short" }).slice(4);
}

type SourceExample = string | null | (() => string);
type SourceItem = [string, string, SourceExample];
type SourceSection = { section: string; items: SourceItem[] };

export interface FormatItem {
  character: string;
  description: string;
  example: string;
}

export interface FormatSection {
  section: string;
  items: FormatItem[];
}

const source: SourceSection[] = [
  {
    section: `Day`,
    items: [
      ["d", "Day of the month, 2 digits with leading zeros", "dd"],
      ["D", "A textual representation of a day, three letters", "EEE"],
      [`j`, `Day of the month without leading zeros`, "d"],
      [`l`, `A full textual representation of the day of the week`, "EEEE"],
      [`N`, `ISO 8601 numeric representation of the day of the week`, "i"],
      [
        `S`,
        `English ordinal suffix for the day of the month, 2 characters`,
        () => format(now, "do").replace(/^\d+/, ""),
      ],
      [`w`, `Numeric representation of the day of the week`, () => formatAndConvertToZeroIndex(now, "i")],
      [
        `z`,
        `The day of the year (starting from 0)`,
        () => formatAndConvertToZeroIndex(now, "D", { useAdditionalDayOfYearTokens: true }),
      ],
    ],
  },
  {
    section: `Week`,
    items: [[`W`, `ISO 8601 week number of year, weeks starting on Monday`, "w"]],
  },
  {
    section: `Month`,
    items: [
      [`F`, `A full textual representation of a month, such as January or March`, "MMMM"],
      [`m`, `Numeric representation of a month, with leading zeros`, "MM"],
      [`M`, `A short textual representation of a month, three letters`, "MMM"],
      [`n`, `Numeric representation of a month, without leading zeros`, "M"],
      [`t`, `Number of days in the given month`, () => String(getDaysInMonth(now))],
    ],
  },
  {
    section: `Year`,
    items: [
      [`L`, `Whether it's a leap year`, () => (isLeapYear(now) ? "1" : "0")],
      [
        `o`,
        `ISO 8601 week-numbering year. This has the same value as "Y", except that if the ISO week number ("W") belongs to the previous or next year, that year is used instead.`,
        "yyyy",
      ],
      [`Y`, `A full numeric representation of a year, 4 digits`, "yyyy"],
      [`y`, `A two digit representation of a year`, "yy"],
    ],
  },
  {
    section: `Time`,
    items: [
      [`a`, `Lowercase Ante meridiem and Post meridiem`, "aaa"],
      [`A`, `Uppercase Ante meridiem and Post meridiem`, "a"],
      [`B`, `Swatch Internet time`, null],
      [`g`, `12-hour format of an hour without leading zeros`, "h"],
      [`G`, `24-hour format of an hour without leading zeros`, "H"],
      [`h`, `12-hour format of an hour with leading zeros`, "hh"],
      [`H`, `24-hour format of an hour with leading zeros`, "HH"],
      [`i`, `Minutes with leading zeros`, "mm"],
      [`s`, `Seconds with leading zeros`, "ss"],
      [`u`, `Microseconds`, null],
      [`v`, `Milliseconds`, null],
    ],
  },
  {
    section: `Timezone`,
    items: [
      [`e`, `Timezone identifier`, () => Intl.DateTimeFormat().resolvedOptions().timeZone],
      [`I`, `(capital "i") Whether or not the date is in daylight saving time (1 or 0)`, null],
      [`O`, `Difference to Greenwich time (GMT) without colon between hours and minutes`, "xx"],
      [`P`, `Difference to Greenwich time (GMT) with colon between hours and minutes`, "xxx"],
      [`p`, `The same as "P", but returns "Z" instead of "+00:00 (available as of PHP 8)"`, "XXX"],
      [`T`, `Timezone abbreviation, if known; otherwise the GMT offset`, () => getShortTimezone()],
      [`Z`, `Timezone offset in seconds: West of UTC is negative; East of UTC is positive`, null],
    ],
  },
  {
    section: `Full Date and Time`,
    items: [
      [`c`, `ISO 8601 date`, `yyyy-MM-dd'T'HH:mm:ss'Z'`],
      [`r`, `RFC 2822 formatted date`, `EEE, d LLL yyyy HH:mm:ss xx`],
      [`U`, `Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)`, "t"],
    ],
  },
  {
    section: `Separators`,
    items: [
      ["-", "Insert a dash", () => "-"],
      ["/", "Insert a slash", () => "/"],
      [":", "Insert a colon", () => ":"],
      [" ", "Insert a space", () => " "],
      [",", "Insert a comma", () => ","],
      [".", "Insert a period", () => "."],
      ["(", "Insert a left parenthesis", () => "("],
      [")", "Insert a right parenthesis", () => ")"],
    ],
  },
];

const data: FormatSection[] = source.map((source) => {
  const { section, items } = source;
  return {
    section,
    items: items.map(([character, description, example]) => {
      // Expand example if we have one
      if ("function" === typeof example) {
        example = example();
      } else if ("string" === typeof example) {
        example = format(now, example);
      } else {
        example = "";
      }

      return {
        character,
        description,
        example,
      };
    }),
  };
});

export default data;

const exampleMap = data.reduce((map, section) => {
  section.items.forEach((item) => map.set(item.character, item.example || "??"));
  return map;
}, new Map<string, string>());

export function getExample(character: string): string {
  if (!character.match(/[a-zA-Z]/)) {
    return character;
  }

  return exampleMap.get(character) || "??";
}

export function getExampleStrict(character: string): string | false {
  if (!character.match(/[a-zA-Z]/)) {
    return character;
  }

  return exampleMap.get(character) || false;
}

export function stackToTemplate(stack?: (FormatItem | FavoriteItem)[]): string {
  return stack ? stack.reduce((template: string, item) => `${template}${item.character}`, ``) : "";
}

export function stackToExample(stack?: (FormatItem | FavoriteItem)[]): string {
  return stack ? stack.reduce((template: string, item) => `${template}${getExample(item.character)}`, ``) : "";
}

export function stackToExampleStrict(stack?: (FormatItem | FavoriteItem)[]): string | false {
  if (!stack) {
    return false;
  }

  return stack.reduce((template: string | false, item) => {
    if (false !== template) {
      const example = getExampleStrict(item.character);

      if (!example) {
        return false;
      }

      return template + example;
    }

    return template;
  }, ``);
}
