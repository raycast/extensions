// Keep the bridge separate so it can be exercised with osascript without loading the host API.
export function calendarScript(start: string, end: string): string {
  return `
ObjC.import('EventKit');
ObjC.import('Foundation');
(function () {
  try {
    var store = $.EKEventStore.alloc.init;
    var status = Number($.EKEventStore.authorizationStatusForEntityType(0));
    if (status === 0) {
      var finished = false;
      var allowed = false;
      var completion = function (granted, error) { allowed = Boolean(granted); finished = true; };
      if (store.respondsToSelector('requestFullAccessToEventsWithCompletion:')) {
        store.requestFullAccessToEventsWithCompletion(completion);
      } else {
        store.requestAccessToEntityTypeCompletion(0, completion);
      }
      var deadline = Date.now() + 45000;
      while (!finished && Date.now() < deadline) {
        $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.1));
      }
      if (!finished) return JSON.stringify({ error: 'Calendar permission request timed out. Allow access, then retry.' });
      if (!allowed) return JSON.stringify({ error: 'Calendar access was denied. Enable calendar access for your launcher in System Settings > Privacy & Security > Calendars, then retry.' });
      store.reset;
    } else if (status !== 3) {
      return JSON.stringify({ error: 'Calendar access is unavailable. Allow full calendar access for your launcher in System Settings > Privacy & Security > Calendars, then retry.' });
    }
    var start = $.NSDate.dateWithTimeIntervalSince1970(Date.parse(${JSON.stringify(start)}) / 1000);
    var end = $.NSDate.dateWithTimeIntervalSince1970(Date.parse(${JSON.stringify(end)}) / 1000);
    // JXA converts JavaScript null to NSNull, not Objective-C nil.
    var calendars = store.calendarsForEntityType(0);
    var predicate = store.predicateForEventsWithStartDateEndDateCalendars(start, end, calendars);
    var matches = store.eventsMatchingPredicate(predicate);
    var events = [];
    for (var i = 0; i < matches.count; i++) {
      var event = matches.objectAtIndex(i);
      if (Number(event.status) === 3) continue; // canceled
      events.push({
        id: ObjC.unwrap(event.calendar.calendarIdentifier) + ':' + ObjC.unwrap(event.eventIdentifier),
        title: ObjC.unwrap(event.title) || '(Untitled event)',
        calendar: ObjC.unwrap(event.calendar.title) || '',
        start: new Date(Number(event.startDate.timeIntervalSince1970) * 1000).toISOString(),
        end: new Date(Number(event.endDate.timeIntervalSince1970) * 1000).toISOString(),
        allDay: Boolean(event.isAllDay)
      });
    }
    return JSON.stringify({ events: events });
  } catch (error) {
    return JSON.stringify({ error: 'Could not read calendars: ' + String(error) });
  }
})()
`;
}
