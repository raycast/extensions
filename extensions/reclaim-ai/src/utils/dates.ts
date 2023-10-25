import { Duration, format, formatDuration as fnsFormatDuration } from "date-fns";
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
  str = str.toLowerCase();
  if (str === "" || !str) return 0;
  const isMinutes = (s: string) => s[s.length - 1] === "m";

  const [p1, p2] = str.split(" ");

  if (!p2) {
    const _n = Number(p1.replace(/\D/g, ""));
    return isMinutes(p1) ? _n : _n * 60;
  }

  const _h = Number(p1.replace(/\D/g, ""));
  const _m = Number(p2.replace(/\D/g, ""));

  const res = _h * 60 + _m;

  return res;
};

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
      break;
    case "P2":
      return "High";
      break;
    case "P3":
      return "Medium";
      break;
    default:
      return "Low";
  }
};

export const formatPriorityIcon = (priority: string): Icon => {
  switch (priority) {
    case "P1":
      return Icon.FullSignal;
      break;
    case "P2":
      return Icon.Signal3;
      break;
    case "P3":
      return Icon.Signal2;
      break;
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
  const replaced = d
    .replaceAll("less than a ", "1")
    .replaceAll(" hours", "h")
    .replaceAll(" hour", "h")
    .replaceAll(" minutes", "m")
    .replaceAll(" minute", "m");

  return replaced;
};

export const TIME_BLOCK_IN_MINUTES = 15;
