/*
 * C = Configure
 */
export type CCalendar = {
  id: string;
  title: string;
  color: string;
  source: string | undefined;
  enabled: boolean;
  isDefault: boolean | undefined;
};

export type CCalendarList = {
  type: CCalendarType;
  list: CCalendar[];
};

export enum CCalendarType {
  CALENDAR = "Calendar",
  REMINDER = "Reminder",
}
export enum CacheKey {
  CONFIGURE_LIST_ITEMS = "Configure List Items",
}
