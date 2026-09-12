import dayjs from "dayjs";
import duration, { Duration } from "dayjs/plugin/duration";

dayjs.extend(duration);

// Parse time string to { hours, minutes } in 24h format
// Supports: "noon", "5p", "5pm", "5:30p", "5:30pm", "5a", "5am", "5:30a", "5:30am"
function parseTimeOfDay(str: string): { hours: number; minutes: number } | null {
  if (str === "noon") return { hours: 12, minutes: 0 };

  // X:XXa/p or X:XXam/pm
  const withMinutes = str.match(/^(\d{1,2}):(\d{2})\s*(a|p)m?$/);
  if (withMinutes) {
    let hours = parseInt(withMinutes[1], 10);
    const minutes = parseInt(withMinutes[2], 10);
    const isPm = withMinutes[3] === "p";
    if (isPm && hours !== 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return { hours, minutes };
  }

  // Xa/p or Xam/pm (no minutes)
  const withoutMinutes = str.match(/^(\d{1,2})\s*(a|p)m?$/);
  if (withoutMinutes) {
    let hours = parseInt(withoutMinutes[1], 10);
    const isPm = withoutMinutes[2] === "p";
    if (isPm && hours !== 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return { hours, minutes: 0 };
  }

  return null;
}

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

export function parseDuration(input: string, now: dayjs.Dayjs = dayjs()): Duration | null {
  const str = input.trim().toLowerCase();
  if (!str) return null;

  // "since <time>" - duration from given time to now
  const sinceMatch = str.match(/^since\s+(.+)$/);
  if (sinceMatch) {
    const time = parseTimeOfDay(sinceMatch[1]);
    if (!time) return null;
    const targetTime = now.startOf("day").add(time.hours, "hour").add(time.minutes, "minute");
    const diff = now.diff(targetTime, "minute");
    if (diff < 0) return null;
    return dayjs.duration({ minutes: diff });
  }

  // "until <time>" - duration from now to given time
  const untilMatch = str.match(/^until\s+(.+)$/);
  if (untilMatch) {
    const time = parseTimeOfDay(untilMatch[1]);
    if (!time) return null;
    const targetTime = now.startOf("day").add(time.hours, "hour").add(time.minutes, "minute");
    const diff = targetTime.diff(now, "minute");
    if (diff < 0) return null;
    return dayjs.duration({ minutes: diff });
  }

  // Check for add/subtract operations
  const opMatch = str.match(/^(.+?)\s*([+-])\s*(.+)$/);
  if (opMatch) {
    const left = parseDuration(opMatch[1], now);
    const right = parseDuration(opMatch[3], now);
    if (!left || !right) return null;

    const op = opMatch[2];
    const result = op === "+" ? left.asMinutes() + right.asMinutes() : left.asMinutes() - right.asMinutes();
    if (result < 0) return null;
    return dayjs.duration({ minutes: result });
  }

  return parseSingleDuration(str);
}
