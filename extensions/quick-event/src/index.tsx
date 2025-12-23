import { ActionPanel, closeMainWindow, Icon, List, getPreferenceValues, Action, Keyboard } from '@raycast/api';
import { formatDate } from './dates';
import { CalendarEvent } from './types';
import { executeJxa, useCalendar } from './useCalendar';

export default function Command() {
  const { isLoading, results, calendars, parse } = useCalendar();
  const preferences = getPreferenceValues();
  const focusOnComplete = preferences.focus;

  const createEvent = async (item: CalendarEvent, calendarName: string) => {
    let script = `
      var app = Application.currentApplication()
      app.includeStandardAdditions = true
      var Calendar = Application("Calendar")
      var date = new Date(${item.startDate.getTime()})
    `;

    if (focusOnComplete) {
      script += `Calendar.viewCalendar({at: date})`;
    }

    executeJxa(`
      var app = Application.currentApplication()
      app.includeStandardAdditions = true
      var Calendar = Application("Calendar")
      
      var eventStart = new Date(${item.startDate.getTime()})
      var eventEnd = new Date(${item.endDate.getTime()})
      
      var projectCalendars = Calendar.calendars.whose({name: "${calendarName}"})
      var projectCalendar = projectCalendars[0]
      var event = Calendar.Event({
        summary: "${item.eventTitle?.replace(/"/g, '\\"')}",
        startDate: eventStart, 
        endDate: eventEnd, 
        alldayEvent: ${item.isAllDay},
        location: "${item.location?.replace(/"/g, '\\"')}",
      })
      projectCalendar.events.push(event)
    `);

    executeJxa(script);
  };

  const getSubtitle = (item: CalendarEvent) => {
    const dateStr = formatDate(item) || 'No date';
    if (item.matchedCalendar) {
      return `${dateStr} → ${item.matchedCalendar}`;
    }
    return dateStr;
  };

  const getOrderedCalendars = (item: CalendarEvent) => {
    if (!item.matchedCalendar) {
      return calendars;
    }
    // Put matched calendar first
    return [item.matchedCalendar, ...calendars.filter((c) => c !== item.matchedCalendar)];
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={parse}
      searchBarPlaceholder="E.g. Movie at 7pm on Friday /work"
      throttle
    >
      <List.Section title="Your quick event">
        {results.map((item) => (
          <List.Item
            key={item.id}
            title={item.eventTitle || 'Untitled event'}
            subtitle={getSubtitle(item)}
            icon={Icon.Calendar}
            accessories={[
              ...(item.timezone ? [{ tag: { value: item.timezone, color: '#34C759' } }] : []),
              ...(item.matchedCalendar ? [{ tag: { value: item.matchedCalendar, color: '#007AFF' } }] : []),
            ]}
            actions={
              <ActionPanel title="Add to calendar">
                {getOrderedCalendars(item).map((calendar, index) => (
                  <Action
                    key={calendar}
                    title={`Add to '${calendar}' Calendar`}
                    onAction={async () => {
                      await createEvent(item, calendar);
                      await closeMainWindow({ clearRootSearch: true });
                    }}
                    icon={{ source: Icon.Calendar }}
                    shortcut={{ modifiers: ['cmd'], key: (index + 1).toString() as Keyboard.KeyEquivalent }}
                  />
                ))}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
