import { TIME, UI_STRINGS } from "../constants";

export function formatExpiryDate(expiresAt: number): string {
  const timeRemaining = expiresAt - Date.now();
  const hours = Math.floor(timeRemaining / TIME.MILLISECONDS_IN_HOUR);
  const days = Math.floor(timeRemaining / TIME.MILLISECONDS_IN_DAY);

  if (hours <= 24) {
    return UI_STRINGS.EXPIRES_IN_HOURS(Math.max(0, hours));
  }
  return UI_STRINGS.EXPIRES_IN_DAYS(days);
}

export function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / TIME.MILLISECONDS_IN_HOUR;

  if (diffInHours < TIME.HOUR_THRESHOLD) {
    const minutes = Math.floor(diffInHours * 60);
    return UI_STRINGS.MINUTES_AGO(minutes);
  } else if (diffInHours < TIME.DAY_THRESHOLD) {
    return UI_STRINGS.HOURS_AGO(Math.floor(diffInHours));
  } else if (diffInHours < TIME.TWO_DAY_THRESHOLD) {
    return UI_STRINGS.YESTERDAY;
  } else {
    return date.toLocaleDateString();
  }
}

export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}
