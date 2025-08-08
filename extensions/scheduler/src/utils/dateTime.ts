export function parseTimeToDate(time: string, reference: Date): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(reference);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function isWithinExecutionWindow(target: Date, now: Date, windowMs = 60000): boolean {
  return now >= target && now < new Date(target.getTime() + windowMs);
}

export function convertScheduleDayToJSDay(scheduleDay: number): number {
  return scheduleDay === 7 ? 0 : scheduleDay;
}

export function toLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
