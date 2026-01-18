import dayjs from "dayjs";
import duration, { Duration } from "dayjs/plugin/duration";

dayjs.extend(duration);

function parseSingleDuration(str: string): Duration | null {
  if (!str) return null;

  // H:MM format (1:30, 2:05)
  const colonMatch = str.match(/^(\d+):(\d{2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    return dayjs.duration({ hours, minutes });
  }

  // Compound XhYm format (1h30m, 2h 15m)
  const compoundMatch = str.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?$/);
  if (compoundMatch) {
    const hours = parseFloat(compoundMatch[1]);
    const minutes = parseInt(compoundMatch[2], 10);
    return dayjs.duration({ hours, minutes });
  }

  // Hours with unit (1h, 1.5h, 2 hours, .25h)
  const hoursMatch = str.match(/^(\d*\.?\d+)\s*h(?:ours?)?$/);
  if (hoursMatch) {
    const hours = parseFloat(hoursMatch[1]);
    const totalMinutes = Math.round(hours * 60);
    return dayjs.duration({ minutes: totalMinutes });
  }

  // Minutes with unit (20m, 90 min, 45 minutes)
  const minutesMatch = str.match(/^(\d+)\s*m(?:in(?:utes?)?)?$/);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1], 10);
    return dayjs.duration({ minutes });
  }

  // Bare number as hours (.5, 1.5, 1, 2)
  const bareNumberMatch = str.match(/^(\d*\.?\d+)$/);
  if (bareNumberMatch) {
    const hours = parseFloat(bareNumberMatch[1]);
    const totalMinutes = Math.round(hours * 60);
    return dayjs.duration({ minutes: totalMinutes });
  }

  return null;
}

export function parseDuration(input: string): Duration | null {
  const str = input.trim().toLowerCase();
  if (!str) return null;

  // Check for add/subtract operations
  const opMatch = str.match(/^(.+?)\s*([+-])\s*(.+)$/);
  if (opMatch) {
    const left = parseDuration(opMatch[1]);
    const right = parseDuration(opMatch[3]);
    if (!left || !right) return null;

    const op = opMatch[2];
    const result = op === "+" ? left.asMinutes() + right.asMinutes() : left.asMinutes() - right.asMinutes();
    if (result < 0) return null;
    return dayjs.duration({ minutes: result });
  }

  return parseSingleDuration(str);
}
