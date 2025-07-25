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
