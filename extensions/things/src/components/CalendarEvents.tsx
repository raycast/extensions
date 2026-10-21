import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import { getCalendarEvents } from '../calendar';
import { eventTimeLabel } from '../calendar-model';
import type { CommandListName } from '../types';
import TodoListActions from './TodoListActions';

function RefreshAction({ refresh }: { refresh: () => void }) {
  return <Action title="Refresh Calendar Events" icon={Icon.ArrowClockwise} onAction={refresh} />;
}

export default function CalendarEvents({
  list,
  names,
  days,
  searchText,
}: {
  list: CommandListName;
  names: string;
  days: string;
  searchText: string;
}) {
  const { data, error, isLoading, revalidate } = usePromise(
    getCalendarEvents,
    [list, names, days, new Date().toDateString()],
    { onError: () => undefined },
  );
  const refresh = () => {
    void revalidate();
  };

  return (
    <List.Section title="Calendar Events" subtitle={isLoading ? 'Loading…' : undefined}>
      {error ? (
        <List.Item
          id="calendar-error"
          title="Calendar events unavailable"
          subtitle={error instanceof Error ? error.message : String(error)}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <RefreshAction refresh={refresh} />
              <Action.OpenInBrowser
                title="Open Calendar Privacy Settings"
                url="x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars"
              />
              <TodoListActions searchText={searchText} commandListName={list} />
            </ActionPanel>
          }
        />
      ) : data?.length ? (
        data.map((event) => (
          <List.Item
            key={event.key}
            id={`calendar:${event.key}`}
            title={event.title}
            icon={Icon.Calendar}
            keywords={[event.calendar]}
            accessories={[
              {
                text: eventTimeLabel(event, list),
                tooltip: `${new Date(event.start).toLocaleString()} – ${new Date(event.end).toLocaleString()}`,
              },
              { text: event.calendar, tooltip: `Calendar: ${event.calendar}` },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Date in Calendar"
                  url={`ical://view?date=${Date.parse(event.start) / 1000 - 978307200}`}
                />
                <RefreshAction refresh={refresh} />
                <TodoListActions searchText={searchText} commandListName={list} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.Item
          id="calendar-empty"
          title={isLoading ? 'Loading calendar events…' : 'No calendar events'}
          subtitle={names ? `Calendars: ${names}` : 'All calendars'}
          icon={Icon.Calendar}
          actions={
            <ActionPanel>
              <RefreshAction refresh={refresh} />
              <TodoListActions searchText={searchText} commandListName={list} />
            </ActionPanel>
          }
        />
      )}
    </List.Section>
  );
}
