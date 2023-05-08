import { runAppleScript } from "run-applescript";
import { PreferenceError } from "../helpers/errors";
import { quoteAndEscape, toAppleScriptDateTime, toAppleScriptList } from "./applescript";

/**
 * Many of the following AppleScript handlers are modified versions of those in CalendarLib EC 1.1.5.
 *
CalendarLib EC is Copyright (c) 2015-21 Shane Stanley <sstanley@myriad-com.com.au>
All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Connects to the event store of given type (0: event, 1: reminder).
 * This used to prompt an alert if access is denied.
  if authorizationStatus is not 3 then
    if entityType is 0
      set entityName to "Calendars"
    else
      set entityName to "Reminders"
    end if
    set alertMessage to "Raycast needs access to your " & entityName & " in order to block time for your to-dos. Please grant access in System Settings > Privacy & Security > " & entityName
    display alert "Access denied" message alertMessage as critical buttons {"OK"} default button 1
    open location "x-apple.systempreferences:com.apple.preference.security?Privacy_" & entityName
    error number -128
  end if
*/

// Initializes the event store. `entityType`: 0 for calendar events, 1 for reminders.
// `requestAccessToEntityType:completion:` must be called before fetching or creating data.
export const initStore = (entityType: 0 | 1) => `use scripting additions
use framework "Foundation"
use framework "EventKit"

on initStore(entityType)
  if entityType is not 0 and entitytype is not 1 then error "Invalid EKEntityType " & entityType
  set theEKEventStore to current application's EKEventStore's alloc()'s init()
  theEKEventStore's requestAccessToEntityType:entityType completion:(missing value)
  set authorizationStatus to current application's EKEventStore's authorizationStatusForEntityType:entityType
  if authorizationStatus is not 3 then error "Invalide authorization status " & authorizationStatus
  return theEKEventStore
end initStore

set theStore to initStore(${entityType})
`;

// Fetches a calendar using the given name and type (local: 0, calDAV/iCloud: 1, exchange: 2, subscription: 3, birthday: 4)
const fetchCalendar = (calendarName: string) => `
on fetchCalendar(calName, calType, theStore)
  if calType < 0 or calType > 4 then error "Invalid EKCalendarType " & calType
  set theCalendars to theStore's calendarsForEntityType:0
  set thePredicate to current application's NSPredicate's predicateWithFormat_("title == %@ AND type == %@", calName, calType)
  return (theCalendars's filteredArrayUsingPredicate:thePredicate)'s firstObject()
end fetchCalendar

set theCal to fetchCalendar("${calendarName}", 1, theStore)
if theCal is missing value then error "Calendar Not Found" number -9999
`;

/**
 * Returns an event that has the given `calendarItemIdentifier`.
 * `calendarItemIdentifier` is marginally more convenient to use than
 * `calendarItemExternalIdentifier` (used by CalendarLib EC) since the former
 * is a unique, local identifier and the latter may not be unique. The former
 * may change, e.g., after a full sync, but should be fine in the context of a
 * Raycast extension where updates and deletions are made within minutes of
 * fetching. But recurring event identifiers of both types are the same for all
 * occurrences. Recurring to-do events are currently not supported, but if they
 * were to be, `eventsMatchingPredicate` may be the only solution.
 * `eventIdentifier` is calendar ID + `calendarItemExternalIdentifier` and also
 * not unique for each occurrence of a recurring event.
 */
const fetchEvent = `
on fetchEvent(calItemID, theStore)
  set theEvent to theStore's calendarItemWithIdentifier:calItemID
  if theEvent is missing value then error "Event not found" number -9998
  return theEvent
end fetchEvent`;

// Returns all events that fall within the given date range, in chronological order. Dates can be AS dates or NSDates.
const fetchEvents = `
on fetchEvents(startDate, endDate, calList, theStore)
  set calListArray to current application's NSArray's arrayWithObject:calList
  set calList to calListArray's |firstObject|()
  if not (calList's isKindOfClass:(current application's NSArray)) as boolean then set calList to calListArray
  set thePredicate to theStore's predicateForEventsWithStartDate:startDate endDate:endDate calendars:calList
  set theEvents to theStore's eventsMatchingPredicate:thePredicate
  set theEvents to theEvents's sortedArrayUsingSelector:"compareStartDateWithEvent:"
  return theEvents as list
end fetchEvents`;

// Returns a list of events whose URL matches the given URL.
const filterByURL = `
on filterEventsByURL(theEvents, urlList)
  set theEventsArray to current application's NSArray's arrayWithObject:theEvents
  set theEvents to theEventsArray's |firstObject|()
  if not (theEvents's isKindOfClass:(current application's NSArray)) as boolean then set theEvents to theEventsArray
  set thePredicate to current application's NSPredicate's predicateWithFormat_("URL.absoluteString IN %@", urlList)
  set theEvents to (theEvents's filteredArrayUsingPredicate:(thePredicate))
  return theEvents as list
end filterEventsByURL`;

// Creates a new event. Location and notes can be missing value, start and end dates can be AS dates or NSDates, and allDay is a boolean.
const create = `
on createEvent(theStore, theCal, theTitle, startD, endD, allDay, theLocation, desc, theURL, theAlarm)
  set newEvent to current application's EKEvent's eventWithEventStore:theStore
  newEvent's setCalendar:theCal
  newEvent's setTitle:theTitle
  newEvent's setStartDate:startD
  newEvent's setEndDate:endD
  newEvent's setAllDay:allDay
  if theLocation is not missing value then newEvent's setLocation:theLocation
  if desc is not missing value then newEvent's setNotes:desc
  if theURL is not missing value and theURL is not "" then newEvent's setURL:(current application's NSURL's URLWithString:theURL)
  if theAlarm is not missing value then newEvent's addAlarm:theAlarm
  return newEvent
end createEvent

-- Saves the given created or modified event to the given store. For recurring events, futureFlag should be true to make changes apply to future events.
on storeEvent(theEvent, theStore, futureFlag)
  set {theResult, theError} to theStore's saveEvent:theEvent span:futureFlag commit:true |error|:(reference)
  if not theResult as boolean then error (theError's |localizedDescription|() as text)
end storeEvent`;

// Converts the given AppleScript list to a String
const concatenate = `
on convertListToString(theList)
  set AppleScript's text item delimiters to ","
  set theString to theList as string
  set AppleScript's text item delimiters to ""
  return theString
end convertListToString`;

// Returns the `calendarIdentifier` of the last created calendar.
export async function createCalendars(titles: string[]): Promise<string> {
  const main = `
    set theLastNewCalendar to createCalendars(${toAppleScriptList(titles)}, theStore)
    return theLastNewCalendar's calendarIdentifier as text

    on createCalendars(theTitles, theStore)
      set defaultCal to theStore's defaultCalendarForNewEvents
      if defaultCal is missing value then error "Default calendar for new events not found"
      set theSource to defaultCal's source
      repeat with aTitle in theTitles
        set newCalendar to current application's EKCalendar's calendarForEntityType:0 eventStore:theStore
        newCalendar's setTitle:aTitle
        newCalendar's setSource:theSource
        set {theResult, theError} to theStore's saveCalendar:newCalendar commit:true |error|:(reference)
        if not theResult as boolean then error (theError's |localizedDescription|() as text)
      end repeat
      return newCalendar
    end createCalendar`;
  return await runAppleScript(initStore(0) + main);
}

export async function createBlock(
  title: string,
  url: string,
  { start, end }: { start: Date; end: Date },
  calendarName: string,
  alarmOffset: string
): Promise<string> {
  const main = `
    set startD to ${toAppleScriptDateTime(new Date(start))}
    set endD to ${toAppleScriptDateTime(new Date(end))}
    set theAlarm to createAlarm(${alarmOffset})

    set newEvent to createEvent(theStore, theCal, "${title}", startD, endD, false, missing value, missing value, "${url}", theAlarm)
    storeEvent(newEvent, theStore, true)
    return newEvent's calendarItemIdentifier() as text

    -- Creates a new alarm with the given relative offset, specified in seconds. The offset should be a negative value.
    on createAlarm(offsetSeconds)
      if offsetSeconds is missing value then return missing value
      set newAlarm to current application's EKAlarm's alarmWithRelativeOffset:offsetSeconds
      return newAlarm
    end createAlarm`;
  return await runAppleScript(initStore(0) + fetchCalendar(calendarName) + main + create);
}

async function runAppleScriptOnEvent(main: string, errorMessage: string): Promise<void> {
  try {
    await runAppleScript(initStore(0) + main + fetchEvent);
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("(-9998)")) {
      throw new Error(`Unable to ${errorMessage}: calendar event not found`);
    }
    throw error;
  }
}

export async function rescheduleEvent(eventId: string, { start, end }: { start: Date; end: Date }): Promise<void> {
  if (end < start) throw new Error("end date must not be before the start date.");
  const main = `
    set startD to ${toAppleScriptDateTime(start)}
    set endD to ${toAppleScriptDateTime(end)}
    set theEvent to fetchEvent("${eventId}", theStore)
    theEvent's setStartDate:startD
    theEvent's setEndDate:endD
    set {theResult, theError} to theStore's saveEvent:theEvent span:0 commit:true |error|:(reference)
    if not theResult as boolean then error (theError's |localizedDescription|() as text)`;
  await runAppleScriptOnEvent(main, "reschedule event");
}

export async function updateEventEndDate(eventId: string, newEnd: Date): Promise<void> {
  const main = `
    set endD to ${toAppleScriptDateTime(newEnd)}
    set theEvent to fetchEvent("${eventId}", theStore)
    theEvent's setEndDate:endD
    set {theResult, theError} to theStore's saveEvent:theEvent span:0 commit:true |error|:(reference)
    if not theResult as boolean then error (theError's |localizedDescription|() as text) number -9997`;

  try {
    await runAppleScriptOnEvent(main, "update end date");
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("The start date must be before the end date. (-9997)")) {
      throw new Error("Unable to update end date: the start date must be before the end date");
    }
    throw error;
  }
}

// Finds and "stops" all running timers started in the last 2 days, and creates a new calendar event a la `createBlock`.
export async function startTimer(title: string, url: string, start: Date, calendarName: string): Promise<string> {
  const main = `
    set startD to ${toAppleScriptDateTime(start)}
    -- Find and end running timers.
    set searchStartD to startD - 2 * days
    set theEvents to fetchEvents(searchStartD, startD, {theCal}, theStore)
    set theEvents to findRunningTimeEntries(theEvents)
    repeat with e in theEvents
      e's setEndDate:startD
      set {theResult, theError} to theStore's saveEvent:e span:0 commit:true |error|:(reference)
      if not theResult as boolean then error (theError's |localizedDescription|() as text)
    end repeat
    -- Start a new timer
    set newEvent to createEvent(theStore, theCal, "${title}", startD, startD, false, missing value, missing value, "${url}", missing value)
    storeEvent(newEvent, theStore, true)
    return newEvent's calendarItemIdentifier() as text

    -- Returns a list of events whose startDate equals endDate.
    on findRunningTimeEntries(theEvents)
      set theEventsArray to current application's NSArray's arrayWithObject:theEvents
      set theEvents to theEventsArray's |firstObject|()
      if not (theEvents's isKindOfClass:(current application's NSArray)) as boolean then set theEvents to theEventsArray
      set thePredicate to current application's NSPredicate's predicateWithFormat_("startDate == endDate")
      set theEvents to (theEvents's filteredArrayUsingPredicate:(thePredicate))
      return theEvents as list
    end findRunningTimeEntries`;
  return await runAppleScript(initStore(0) + fetchCalendar(calendarName) + main + fetchEvents + create);
}

export async function updateBlockTitles(
  newTitle: string,
  urls: string[],
  calendarName: string,
  { start, end }: { start: number; end: number }
): Promise<string[]> {
  const main = `
    set startD to ${toAppleScriptDateTime(new Date(start))}
    set endD to ${toAppleScriptDateTime(new Date(end))}
    set theEvents to fetchEvents(startD, endD, {theCal}, theStore)
    set theEvents to filterEventsByURL(theEvents, ${toAppleScriptList(urls)})
    set updatedEventIdList to {}
    set updatedEventIdListRef to a reference to updatedEventIdList
    repeat with e in theEvents
      e's setTitle:${quoteAndEscape(newTitle)}
      set {theResult, theError} to theStore's saveEvent:e span:0 commit:true |error|:(reference)
      if not theResult as boolean then error (theError's |localizedDescription|() as text)
      copy (e's calendarItemIdentifier() as text) to the end of updatedEventIdListRef
    end repeat
    return convertListToString(updatedEventIdListRef)`;

  try {
    const updatedEventIds = await runAppleScript(
      initStore(0) + fetchCalendar(calendarName) + main + fetchEvents + filterByURL + concatenate
    );
    return updatedEventIds !== "" ? updatedEventIds.split(",") : [];
  } catch (error) {
    // Throw a comprehensible error when the given calendar name is not found in the database. This error occurs when
    // EditTodoForm is submitted and the Calendar for Time Tracking preference value is incorrect.
    if (error instanceof Error && error.message.endsWith("(-9999)")) {
      throw new PreferenceError(
        `Unable to update calendar event titles: Calendar "${calendarName}" Not Found`,
        "extension"
      );
    }
    throw error;
  }
}

export async function updateEventURL(eventId: string, newURL: string): Promise<void> {
  const main = `
    set theEvent to fetchEvent("${eventId}", theStore)
    theEvent's setURL:(current application's NSURL's URLWithString:"${newURL}")
    set {theResult, theError} to theStore's saveEvent:theEvent span:0 commit:true |error|:(reference)
    if not theResult as boolean then error (theError's |localizedDescription|() as text)`;
  await runAppleScriptOnEvent(main, "update event URL");
}

export async function deleteEvent(eventId: string): Promise<void> {
  const main = `
    set theEvent to fetchEvent("${eventId}", theStore)
    set {theResult, theError} to theStore's removeEvent:theEvent span:0 commit:true |error|:(reference)
    if not theResult as boolean then error (theError's localizedDescription() as text)`;
  await runAppleScriptOnEvent(main, "delete event");
}

export async function deleteBlocks(
  urls: string[],
  calendarName: string,
  { start, end }: { start: number; end: number }
): Promise<string[]> {
  const main = `
    set startD to ${toAppleScriptDateTime(new Date(start))}
    set endD to ${toAppleScriptDateTime(new Date(end))}
    set theEvents to fetchEvents(startD, endD, {theCal}, theStore)
    set theEvents to filterEventsByURL(theEvents, ${toAppleScriptList(urls)})
    set deletedEventIdList to {}
    set deletedEventIdListRef to a reference to deletedEventIdList
    repeat with e in theEvents
      set {theResult, theError} to theStore's removeEvent:e span:0 commit:true |error|:(reference)
      if not theResult as boolean then error (theError's |localizedDescription|() as text)
      copy (e's calendarItemIdentifier() as text) to the end of deletedEventIdListRef
    end repeat
    return convertListToString(deletedEventIdListRef)`;
  const deletedEventIds = await runAppleScript(
    initStore(0) + fetchCalendar(calendarName) + main + fetchEvents + filterByURL + concatenate
  );
  return deletedEventIds !== "" ? deletedEventIds.split(",") : [];
}
