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
  // Convert time ranges like "2-3pm", "2:30-3:30pm", "10-11am" to "from 2pm to 3pm" format
  // Using "from X to Y" helps Sherlock parse time ranges without confusing the "to" with dates
  const timeRangePattern = /\b(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/gi;
  query = query.replace(timeRangePattern, (_, start, end, ampm) => {
    return `from ${start}${ampm} to ${end}${ampm}`;
  });

  // Also handle "2pm-3pm" format (where am/pm is on both sides)
  const timeRangeWithBothPattern = /\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/gi;
  query = query.replace(timeRangeWithBothPattern, (_, start, ampm1, end, ampm2) => {
    return `from ${start}${ampm1} to ${end}${ampm2}`;
  });

  // Match patterns like 14u, 14h, 14u40, etc. (EU time formats)
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
