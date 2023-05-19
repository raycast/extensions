import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { ExtensionPreferences } from "./types";

/**
 * Removes extraneous symbols from a string and limits it to (by default) 3000 characters.
 *
 * @param str The string to filter.
 * @param cutoff The length to limit the string to, defaults to 3000.
 * @returns The filtered string.
 */
export const filterString = (str: string, cutoff?: number): string => {
  /* Removes unnecessary/invalid characters from strings. */
  const preferences = getPreferenceValues<ExtensionPreferences>();
  if (preferences.condenseAmount == "high") {
    // Remove some useful characters for the sake of brevity
    return str
      .replaceAll(/[^A-Za-z0-9,.?!\-()/[\]{}@: \n\r<>]/g, "")
      .replaceAll('"', "'")
      .substring(0, cutoff || parseInt(preferences.lengthLimit) + 500 || 3000);
  } else if (preferences.condenseAmount == "medium") {
    // Remove uncommon characters
    return str
      .replaceAll(/[^A-Za-z0-9,.?!\-()/[\]{}@: \n\r<>+*&|]/g, "")
      .replaceAll('"', "'")
      .substring(0, cutoff || parseInt(preferences.lengthLimit) + 500 || 3000);
  } else if (preferences.condenseAmount == "low") {
    // Remove all characters except for letters, numbers, and punctuation
    return str
      .replaceAll(/[^A-Za-z0-9,.?!\-()/[\]{}@:; \n\r\t<>%^$~+*_&|]/g, "")
      .replaceAll('"', "'")
      .substring(0, cutoff || parseInt(preferences.lengthLimit) + 500 || 3000);
  } else {
    // Just remove quotes and cut off at the limit
    return str.replaceAll('"', "'").substring(0, cutoff || parseInt(preferences.lengthLimit) + 500 || 3000);
  }
};

/**
 * Time durations to use in calendar-related methods.
 */
export enum CalendarDuration {
  DAY = 0,
  WEEK = 1,
  MONTH = 2,
  YEAR = 3,
}

/**
 * Gets the current time in HH:MM AM/PM format.
 *
 * @returns The current time as a string.
 */
export const getCurrentTime = (): string => {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", hour12: true, minute: "numeric" });
};

/**
 * Gets the current day in the format of Month Name Day Number, Year
 * @returns The current date as a string.
 */
export const getCurrentDate = (): string => {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

/**
 * Gets calendar events occurring between now and the end of the specified duration.
 *
 * @param duration The span of time get events of.
 * @returns A promise which resolves to the list of events as a string.
 */
export const getUpcomingCalendarEvents = async (duration: CalendarDuration): Promise<string> => {
  const setDurationCommand = (() => {
    switch (duration) {
      case CalendarDuration.DAY:
        return "dateComponents's setDay:1";
        break;
      case CalendarDuration.WEEK:
        return "dateComponents's setDay:7";
        break;
      case CalendarDuration.MONTH:
        return "dateComponents's setMonth:1";
        break;
      case CalendarDuration.YEAR:
        return "dateComponents's setYear:1";
        break;
    }
  })();

  return runAppleScript(`use framework "EventKit"
      property ca : current application
      
      set eventStore to ca's EKEventStore's alloc()'s init()
      eventStore's reset()
      eventStore's requestAccessToEntityType:((get ca's EKEntityMaskEvent) + (get ca's EKEntityMaskReminder)) completion:(missing value)
      delay 0.1
      
      set startDate to ca's NSDate's |date|()
      
      set calendar to ca's NSCalendar's currentCalendar()
      set dateComponents to ca's NSDateComponents's alloc()'s init()
      ${setDurationCommand}
      set endDate to calendar's dateByAddingComponents:dateComponents toDate:startDate options:(ca's NSCalendarMatchStrictly)
      
      set thePredicate to eventStore's predicateForEventsWithStartDate:startDate endDate:endDate calendars:(missing value)
      set upcomingEvents to eventStore's eventsMatchingPredicate:thePredicate
      set theEventsData to {title, startDate, endDate} of upcomingEvents
      
      set theEvents to {}
      repeat with index from 1 to (count of upcomingEvents)
        set eventTitle to (item index of item 1 of theEventsData) as text
        set eventStartDate to item index of item 2 of theEventsData
        set eventEndDate to item index of item 3 of theEventsData
        
        set startDateFormatter to ca's NSDateFormatter's alloc()'s init()
        (startDateFormatter's setDateFormat:"MMMM dd, YYYY 'at' HH:mm a")
        set eventStartString to (startDateFormatter's stringFromDate:eventStartDate)
        
        set endDateFormatter to ca's NSDateFormatter's alloc()'s init()
        (endDateFormatter's setDateFormat:"HH:mm a")
        set eventEndString to (endDateFormatter's stringFromDate:eventEndDate)
        
        set eventInfo to eventTitle & " on " & eventStartString & " until " & eventEndString
        copy eventInfo to end of theEvents
      end repeat
      
      return theEvents`).then((eventsString) => {
    const shortenedEventsString = filterString(eventsString);
    if (shortenedEventsString.length < eventsString.length - 100) {
      return shortenedEventsString + " There are more events, but there are too many to list here.";
    }

    return shortenedEventsString;
  });
};

/**
 * Gets reminders with a due date between now and the end of the specified duration.
 *
 * @param duration The span of time to get reminders of.
 * @returns A promise which resolves to the list of reminders as a string.
 */
export const getUpcomingReminders = async (duration: CalendarDuration): Promise<string> => {
  const setDurationCommand = (() => {
    switch (duration) {
      case CalendarDuration.DAY:
        return "dateComponents's setDay:1";
        break;
      case CalendarDuration.WEEK:
        return "dateComponents's setDay:7";
        break;
      case CalendarDuration.MONTH:
        return "dateComponents's setMonth:1";
        break;
      case CalendarDuration.YEAR:
        return "dateComponents's setYear:1";
        break;
    }
  })();

  return runAppleScript(`use framework "EventKit"
      property ca : current application
      
      set eventStore to ca's EKEventStore's alloc()'s init()
      eventStore's reset()
      eventStore's requestAccessToEntityType:((get ca's EKEntityMaskEvent) + (get ca's EKEntityMaskReminder)) completion:(missing value)
      delay 0.1
      
      set startDate to ca's NSDate's |date|()
      
      set calendar to ca's NSCalendar's currentCalendar()
      set dateComponents to ca's NSDateComponents's alloc()'s init()
      ${setDurationCommand}
      set endDate to calendar's dateByAddingComponents:dateComponents toDate:startDate options:(ca's NSCalendarMatchStrictly)
      
      set remindersPredicate to eventStore's predicateForIncompleteRemindersWithDueDateStarting:startDate ending:endDate calendars:(missing value)
      set upcomingReminders to eventStore's remindersMatchingPredicate:remindersPredicate
      set theRemindersData to {title, dueDate} of upcomingReminders
      
      set theReminders to {}
      repeat with index from 1 to (count of upcomingReminders)
        set eventTitle to (item index of item 1 of theRemindersData) as text
        set eventDueDate to item index of item 2 of theRemindersData
        
        set dueDateFormatter to ca's NSDateFormatter's alloc()'s init()
        (dueDateFormatter's setDateFormat:"MMMM dd, YYYY 'at' HH:mm a")
        set eventDueString to (dueDateFormatter's stringFromDate:eventDueDate)
        
        set reminderInfo to eventTitle & " on " & eventDueString
        copy reminderInfo to end of theReminders
      end repeat
      
      return theReminders`).then((remindersString) => {
    const shortenedRemindersString = filterString(remindersString);
    if (shortenedRemindersString.length < remindersString.length - 100) {
      return shortenedRemindersString + " There are more reminders, but there are too many to list here.";
    }

    return shortenedRemindersString;
  });
};
