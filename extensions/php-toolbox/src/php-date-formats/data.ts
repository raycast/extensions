import { format, getDaysInMonth, isLeapYear } from "date-fns";

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
];

const data: FormatSection[] = source.map(({ section, items }) => ({
  section,
  items: items.map(([character, description, example]) => ({
    character,
    description,
    example: resolveExample(example),
  })),
}));

function resolveExample(example: SourceExample): string {
  if ("function" === typeof example) {
    return example();
  }

  if ("string" === typeof example) {
    return format(now, example);
  }

  return "";
}

export default data;
