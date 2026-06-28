import { addHours, addMinutes, differenceInCalendarDays, format, roundToNearestMinutes } from 'date-fns';
import { CalendarEvent } from './types';

export const getHumanDateFormat = 'MMM dd, yyyy';
export const getHumanTimeFormat = 'h:mm aa';

export const formatRelativeDay = (date: Date, relativeDate: Date) => {
  switch (differenceInCalendarDays(date, relativeDate)) {
    case -1:
      return 'yesterday';
    case 0:
      return 'today';
    case 1:
      return 'tomorrow';
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      return format(date, 'cccc');
    default:
      return format(date, getHumanDateFormat);
  }
};

export const getStartDate = () => {
  const startDate = addMinutes(new Date(), 15);

  const startDateNearest = roundToNearestMinutes(startDate, {
    nearestTo: 30,
  });

  return startDateNearest;
};

export const getEndDate = (startDate: Date) => {
  const endDate = new Date(startDate);
  return addHours(endDate, 1);
};

export const formatDate = (item: CalendarEvent): string => {
  if (item.isAllDay) {
    return `${formatRelativeDay(item.startDate, new Date())} all-day`;
  } else {
    return `${formatRelativeDay(item.startDate, new Date())} from ${format(
      item.startDate,
      getHumanTimeFormat,
    )} to ${format(item.endDate, getHumanTimeFormat)}`;
  }
};

export const preprocessQuery = (query: string): string => {
  // Match patterns like 14u, 14h, 14u40, etc.
  const timePattern = /\b(\d{1,2})([uUhH])(\d{2})?\b/g;
  query = query.replace(timePattern, (match, hour, _, minutes) => {
    hour = parseInt(hour, 10);
    minutes = minutes ? parseInt(minutes, 10) : 0;

    const date = new Date();
    date.setHours(hour, minutes, 0, 0);

    // Format the time correctly as "h:mm aa" (e.g., "2:00 PM" or "2:30 PM")
    return format(date, 'h:mm aa');
  });

  return query;
};
