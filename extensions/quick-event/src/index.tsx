import { ActionPanel, closeMainWindow, Icon, List, preferences } from '@raycast/api';
import { formatDate } from './dates';
import { CalendarEvent } from './types';
import { executeJxa, useCalendar } from './useCalendar';

export default function Command() {
  const { isLoading, results, parse } = useCalendar();

  const calendars = String(preferences.calendars.value).split(',');

  const createEvent = async (item: CalendarEvent, calendarName: string) => {
    executeJxa(`
      var app = Application.currentApplication()
      app.includeStandardAdditions = true
      var Calendar = Application("Calendar")
      
      var eventStart = new Date(${item.startDate.getTime()})
      var eventEnd = new Date(${item.endDate.getTime()})
      
      var projectCalendars = Calendar.calendars.whose({name: "${calendarName}"})
      var projectCalendar = projectCalendars[0]
      var event = Calendar.Event({
        summary: "${item.eventTitle}", 
        startDate: eventStart, 
        endDate: eventEnd, 
        alldayEvent: ${item.isAllDay},
      })
      projectCalendar.events.push(event)
    `);

    executeJxa(`
      var app = Application.currentApplication()
      app.includeStandardAdditions = true
      var Calendar = Application("Calendar")
      var date = new Date(${item.startDate.getTime()})
      Calendar.viewCalendar({at: date})
    `);
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
              <ActionPanel>
                {calendars.map((calendar, index) => (
                  <ActionPanel.Item
                    key={index}
                    title={`Add to '${calendar}' Calendar`}
                    onAction={async () => {
                      await createEvent(item, calendar);
                      await closeMainWindow({ clearRootSearch: true });
                    }}
                    icon={{ source: Icon.Calendar }}
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
