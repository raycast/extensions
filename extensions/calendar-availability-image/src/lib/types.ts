export type Lang = "de" | "en";

export interface Options {
  weeks: number;
  startHour: number;
  endHour: number;
  minSlotMinutes: number;
  tentativeIsBusy: boolean;
  includeWeekend: boolean;
  language: Lang;
}

export interface Interval {
  start: number;
  end: number;
}

export interface BusyEvent extends Interval {
  tentative: boolean;
  allDay: boolean;
}

export interface DayPlan {
  date: Date;
  windowStart: number;
  windowEnd: number;
  busy: Interval[];
  tentative: Interval[];
  past: Interval | null;
  free: Interval[];
}
