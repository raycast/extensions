import { format } from "date-fns";
import { Icon } from "@raycast/api";

export const formatDisplayEventHours = ({
  start,
  end,
  hoursFormat,
}: {
  start: Date;
  end: Date;
  hoursFormat: "12h" | "24h";
}) => {
  const startString = formatDisplayHours(start, hoursFormat);
  const endString = formatDisplayHours(end, hoursFormat);

  return `${startString} - ${endString}`;
};

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * 60;
const SECONDS_PER_DAY = SECONDS_PER_HOUR * 24;
const SECONDS_PER_WEEK = SECONDS_PER_DAY * 7;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const MILLISECONDS_PER_HOUR = SECONDS_PER_HOUR * MILLISECONDS_PER_SECOND;
const MILLISECONDS_PER_DAY = SECONDS_PER_DAY * MILLISECONDS_PER_SECOND;
const MILLISECONDS_PER_WEEK = SECONDS_PER_WEEK * MILLISECONDS_PER_SECOND;

export const formatDisplayHours = (date: Date, hoursFormat: "12h" | "24h" = "12h") => {
  const formatType = hoursFormat === "12h" ? "h:mm a" : "HH:mm";
  return format(date, formatType);
};

/**
 * Receives a duration string.
 * Eg: "1h 30m", "30m" or "2h"
 *
 * @param str
 * @returns the amount minutes in number
 */
export const parseDurationToMinutes = (str: string): number => {
  const resInMilliseconds = parseDuration(str);

  if (resInMilliseconds == null) {
    // check for undefined and null
    return 0;
  } else {
    return resInMilliseconds / MILLISECONDS_PER_MINUTE;
  }
};

/**
 * Parses a string into milliseconds.
 * @param value The string duration
 * @returns the duration in ms
 */
function parseDuration(value: string): number | undefined {
  const PARSE_DURATION_REGEX =
    /\[?(\d*[.,]?\d+)\s?(minute(?:s)?|min|mn|m|second(?:s)?|sec|s|h(?:ou)?r(?:s)?|h|day(?:s)?|d|w(?:ee)?k(?:s)?|w)]?/gi;

  const stringToParse = value.toLowerCase();

  const matches = stringToParse.matchAll(PARSE_DURATION_REGEX);
  let match = matches.next();
  let duration = 0;

  while (!match.done) {
    const num = parseFloat(match.value[1].replace(/,/g, "."));
    if (isNaN(num)) return;
    if (num <= 0) return;

    const unit = match.value[2];

    switch (unit[0]) {
      case "w":
        duration += num * MILLISECONDS_PER_WEEK;
        break;
      case "d":
        duration += num * MILLISECONDS_PER_DAY;
        break;
      case "m":
        duration += num * MILLISECONDS_PER_MINUTE;
        break;
      case "s":
        duration += num * MILLISECONDS_PER_SECOND;
        break;
      case "h":
      default:
        // Assume unit is a hour
        duration += num * MILLISECONDS_PER_HOUR;
        break;
    }

    match = matches.next();
  }

  return duration > 0 ? duration : undefined;
}

const formatHMString = (hstr: string, mstr: string) => {
  let h = 0;
  let m = 0;
  let remainingHours = 0;

  const _h = Number(hstr.replace(/\D/g, ""));
  const _m = Number(mstr.replace(/\D/g, ""));

  if (_m >= 60) {
    remainingHours = Math.floor(_m / 60);
    m = _m - remainingHours * 60;
  } else {
    m = _m;
  }

  h = _h + remainingHours;

  const hasMinutes = m != 0 ? ` ${m}m` : "";
  const hasHours = h != 0 ? `${h}h` : "";
  return `${hasHours}${hasMinutes}`.trim();
};

export const formatPriority = (priority: string): string => {
  switch (priority) {
    case "P1":
      return "Critical";
    case "P2":
      return "High";
    case "P3":
      return "Medium";
    default:
      return "Low";
  }
};

export const formatPriorityIcon = (priority: string): Icon => {
  switch (priority) {
    case "P1":
      return Icon.FullSignal;
    case "P2":
      return Icon.Signal3;
    case "P3":
      return Icon.Signal2;
    default:
      return Icon.Signal1;
  }
};

export const formatStrDuration = (str: string): string => {
  if (!str) return "";

  const rawSplitHM = str.match(/\d+((\s\D)|(\D))?/g);

  if (!rawSplitHM) return `0h`;

  if (rawSplitHM.length === 1) {
    const txt = rawSplitHM[0];

    if (!isNaN(Number(txt))) return formatHMString("0", txt);

    if (txt[txt.length - 1] === "h") return txt.replace(" ", "");
    if (txt[txt.length - 1] === "m") return formatHMString("0", txt);

    return `0h`;
  }

  if (rawSplitHM.length !== 2) return `0h`;

  const [hstr, mstr] = rawSplitHM.map((x) => x.replace(" ", ""));

  return formatHMString(hstr, mstr);
};

export const formatDuration = (e: string | undefined) => {
  if (!e) {
    return `0 m`;
  }
  if (e.replace(/(\s|^)\d+(\s|$)/g, "") === "") {
    return formatStrDuration(`${e} m`);
  }
  return formatStrDuration(e);
};

export const miniDuration = (d: string) => {
  return d
    .replaceAll("less than a ", "1")
    .replaceAll(" hours", "h")
    .replaceAll(" hour", "h")
    .replaceAll(" minutes", "m")
    .replaceAll(" minute", "m");
};

export const TIME_BLOCK_IN_MINUTES = 15;
