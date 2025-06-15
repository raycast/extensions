import { ActionPanel, closeMainWindow, Icon, List, getPreferenceValues, Action, Keyboard } from '@raycast/api';
import { formatDate } from './dates';
import { CalendarEvent } from './types';
import { executeJxa, useCalendar } from './useCalendar';

export default function Command() {
  const { isLoading, results, parse } = useCalendar();
  const preferences = getPreferenceValues();

  const calendars = String(preferences.calendars).split(',');
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

  return (
    <List isLoading={isLoading} onSearchTextChange={parse} searchBarPlaceholder="E.g. Movie at 7pm on Friday" throttle>
      <List.Section title="Your quick event">
        {results.map((item) => (
          <List.Item
            key={item.id}
            title={item.eventTitle || 'Untitled event'}
            subtitle={formatDate(item) || 'No date'}
            icon={Icon.Calendar}
            actions={
              <ActionPanel title="Add to a different calendar">
                {calendars.map((calendar, index) => (
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
