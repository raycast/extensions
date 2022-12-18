export type Duration = {
  hours: number;
  minutes: number;
  seconds: number;
};

export function calcElapsedTime(since: Date): Duration {
  const now = new Date();
  const totalSeconds = (now.getTime() - since.getTime()) / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
  const seconds = Math.floor(totalSeconds - minutes * 60 - hours * 3600);
  return { hours, minutes, seconds };
}

export function formatDuration(duration: Duration): string {
  return duration.hours > 0
    ? `${pad(duration.hours)}:${pad(duration.minutes)}:${pad(duration.seconds)}`
    : `${pad(duration.minutes)}:${pad(duration.seconds)}`;
}

export function pad(num: number): string {
  if (num < 10) {
    return `0${num}`;
  } else {
    return `${num}`;
  }
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseIntPreference(value: string | undefined, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }

  return parseInt(value);
}
