export const FIVE_MINUTES = 5 * 60 * 1000;
export const TEN_HOURS = 10 * 3600;
export const FORTY_HOURS = 40 * 3600;

export type Time = { hours: number; minutes: number };

export function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(":").map(Number);
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

export const calculateDurationSeconds = (start: string, end: string) => {
  const pStart = parseTime(start);
  const pEnd = parseTime(end);

  if (!pEnd) {
    throw Error(`End time invalid: '${start}' - '${end}'`);
  }
  if (!pStart) {
    throw Error(`Start invalid: '${start}' - '${end}'`);
  }

  const { hours: sh, minutes: sm } = pStart!;
  const { hours: eh, minutes: em } = pEnd!;

  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const diffMins =
    endMins >= startMins ? endMins - startMins : 24 * 60 - startMins + endMins;
  return diffMins * 60;
};

export function formatDuration(
  totalSeconds: number,
  durationFormat: string,
): string {
  if (durationFormat === "decimal") {
    return `${(totalSeconds / 3600).toFixed(2)} h`;
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function formatOvertime(
  seconds: number,
  durationFormat: string,
): string {
  const sign = seconds < 0 ? "−" : "";
  return sign + formatDuration(Math.abs(seconds), durationFormat);
}

export function todayLocalDate(): string {
  return formatDate(new Date())!;
}

export function formatDate(date?: Date): string | undefined {
  if (!date) {
    return undefined;
  }

  // en-CA → YYYY-MM-DD in local time
  return date.toLocaleDateString("en-CA");
}

const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export function parseDate(input?: string): Date | undefined {
  if (!input) {
    return undefined;
  }

  if (!dateRegex.test(input)) {
    throw Error(
      `Invalid date format: Expected 'YYYY-MM-DD', actual: '${input}'`,
    );
  }

  const [year, month, day] = input.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (isNaN(date.getTime())) {
    throw Error(`Invalid date: '${input}'`);
  }
  return date;
}

export function parseTime(input?: string): Time | undefined {
  if (!input) return undefined;

  const s = input.trim().replace(/[.,;]/g, ":");
  let hours: number;
  let minutes: number;

  const parts = s.split(":");

  if (parts.length === 1) {
    const digits = parts[0];
    if (!/^\d+$/.test(digits) || digits.length === 0) return undefined;

    if (digits.length === 1) {
      hours = parseInt(digits, 10);
      minutes = 0;
    } else if (digits.length === 2) {
      const n = parseInt(digits, 10);
      if (n <= 23) {
        hours = n;
        minutes = 0;
      } else {
        hours = parseInt(digits[0], 10);
        minutes = parseInt(digits[1], 10) * 10;
      }
    } else if (digits.length === 3) {
      const firstTwo = parseInt(digits.substring(0, 2), 10);
      if (firstTwo <= 23) {
        hours = firstTwo;
        minutes = parseInt(digits[2], 10) * 10;
      } else {
        hours = parseInt(digits[0], 10);
        minutes = parseInt(digits.substring(1), 10);
      }
    } else if (digits.length === 4) {
      hours = parseInt(digits.substring(0, 2), 10);
      minutes = parseInt(digits.substring(2), 10);
    } else {
      return undefined;
    }
  } else if (parts.length === 2) {
    const [hStr, mStr] = parts;
    if (!/^\d+$/.test(hStr)) return undefined;
    hours = parseInt(hStr, 10);
    if (mStr === "") {
      minutes = 0;
    } else if (!/^\d+$/.test(mStr)) {
      return undefined;
    } else if (mStr.length === 1) {
      minutes = parseInt(mStr, 10) * 10;
    } else {
      minutes = parseInt(mStr, 10);
    }
  } else if (parts.length === 3) {
    const [hStr, mStr, sStr] = parts;
    if (!/^\d+$/.test(hStr) || !/^\d+$/.test(mStr) || !/^\d+$/.test(sStr))
      return undefined;
    hours = parseInt(hStr, 10);
    minutes = parseInt(mStr, 10);
    if (parseInt(sStr, 10) > 0) minutes++;
  } else {
    return undefined;
  }

  if (minutes > 60) return undefined;
  if (minutes === 60) {
    minutes = 0;
    hours++;
  }

  if (hours === 24 && minutes === 0) hours = 0;
  else if (hours > 23) return undefined;

  return { hours, minutes };
}

export function formatTime(
  input?:
    | {
        hours: number;
        minutes: number;
      }
    | Date
    | string,
): string | undefined {
  if (input === undefined || input === null) return undefined;

  let time: { hours: number; minutes: number };
  if (typeof input === "string") {
    const pTime = parseTime(input);
    if (!pTime) return undefined;
    time = pTime;
  } else if ("hours" in input && "minutes" in input) {
    time = input;
  } else if (input instanceof Date && !isNaN(input.getTime())) {
    time = { hours: input.getHours(), minutes: input.getMinutes() };
  } else {
    return undefined;
  }

  return `${time.hours.toString().padStart(2, "0")}:${time.minutes.toString().padStart(2, "0")}`;
}

export function compareTime(a?: Time, b?: Time): number {
  if (a && !b) return 1;
  if (!a && b) return -1;
  if (!a && !b) return 0;

  return a!.hours * 60 + a!.minutes - (b!.hours * 60 + b!.minutes);
}
