export interface CalendarEvent {
  id: string;
  eventTitle?: string | null;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  validated: boolean;
  location?: string;
}
