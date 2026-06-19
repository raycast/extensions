/**
 * Normalize supported time input to HH:MM.
 * Supports H:MM, HH:MM, Hh, and HhMM.
 */
export function normalizeTimeInput(time: string): string | null {
  const normalized = time.trim().toLowerCase();
  const colonMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  const hourMatch = normalized.match(/^(\d{1,2})h$/);
  const hourMinuteMatch = normalized.match(/^(\d{1,2})h(\d{2})$/);

  let hours: number;
  let minutes: number;

  if (colonMatch) {
    hours = parseInt(colonMatch[1], 10);
    minutes = parseInt(colonMatch[2], 10);
  } else if (hourMatch) {
    hours = parseInt(hourMatch[1], 10);
    minutes = 0;
  } else if (hourMinuteMatch) {
    hours = parseInt(hourMinuteMatch[1], 10);
    minutes = parseInt(hourMinuteMatch[2], 10);
  } else {
    return null;
  }

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTimeWithSeconds(time: string): string | null {
  const normalizedTime = normalizeTimeInput(time);

  if (!normalizedTime) {
    return null;
  }

  return `${normalizedTime}:00`;
}

export function parseTimeRangeToSeconds(startTime: string, endTime: string): number | null {
  const normalizedStartTime = normalizeTimeInput(startTime);
  const normalizedEndTime = normalizeTimeInput(endTime);

  if (!normalizedStartTime || !normalizedEndTime) {
    return null;
  }

  const [startHours, startMinutes] = normalizedStartTime.split(":").map((value) => parseInt(value, 10));
  const [endHours, endMinutes] = normalizedEndTime.split(":").map((value) => parseInt(value, 10));

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  if (endTotalMinutes <= startTotalMinutes) {
    return null;
  }

  return (endTotalMinutes - startTotalMinutes) * 60;
}
