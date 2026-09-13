import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { searchEntities, ConnectionProblem } from "./api/client";
import { useConnection, ConnectionErrorEmptyView } from "./components/connection";
import { relativeDate, capitalize, statusColor } from "./utils/formatters";
import { openAppUrl } from "./utils/deeplinks";
import EntityDetail from "./entity-detail";

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  );
}

function isOverdue(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function isUpcoming(dateStr: string, daysAhead = 7): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + daysAhead);
  return d >= today && d <= cutoff;
}

function useBriefingData(enabled: boolean, podKey: string) {
  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError,
    revalidate: revalidateTasks,
  } = useCachedPromise(
    (_pod: string) => searchEntities("", { profileSlug: "task", limit: 100, scope: "all" }),
    [podKey],
    { keepPreviousData: true, execute: enabled }
  );

  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
    revalidate: revalidateEvents,
  } = useCachedPromise(
    (_pod: string) => searchEntities("", { profileSlug: "event", limit: 50, scope: "all" }),
    [podKey],
    { keepPreviousData: true, execute: enabled }
  );

  const activeTasks = (tasks ?? []).filter((t) => t.status !== "done" && t.status !== "cancelled");
  const overdueTasks = activeTasks.filter((t) => t.dueDate && isOverdue(t.dueDate));
  const todayTasks = activeTasks.filter((t) => t.dueDate && isToday(t.dueDate));
  const upcomingTasks = activeTasks.filter(
    (t) => t.dueDate && !isOverdue(t.dueDate) && !isToday(t.dueDate) && isUpcoming(t.dueDate)
  );
  const todayEvents = (events ?? []).filter((e) => {
    const start = e.properties?.startDate as string | undefined;
    return start && isToday(start);
  });
  const upcomingEvents = (events ?? []).filter((e) => {
    const start = e.properties?.startDate as string | undefined;
    return start && !isToday(start) && isUpcoming(start);
  });

  return {
    overdueTasks,
    todayTasks,
    upcomingTasks,
    todayEvents,
    upcomingEvents,
    isLoading: tasksLoading || eventsLoading,
    error: tasksError ?? eventsError,
    retry: () => {
      revalidateTasks();
      revalidateEvents();
    },
  };
}

export default function DailyBriefing() {
  const { connection, isLoading: connLoading, podKey } = useConnection();
  const connected = connection != null;

  const { overdueTasks, todayTasks, upcomingTasks, todayEvents, upcomingEvents, isLoading, error, retry } =
    useBriefingData(connected, podKey);

  if (!connLoading && !connected) {
    return (
      <List navigationTitle="Daily Briefing">
        <ConnectionErrorEmptyView error={new ConnectionProblem("not-configured", null)} />
      </List>
    );
  }

  const isEmpty =
    overdueTasks.length === 0 &&
    todayTasks.length === 0 &&
    upcomingTasks.length === 0 &&
    todayEvents.length === 0 &&
    upcomingEvents.length === 0;

  return (
    <List
      isLoading={connLoading || isLoading}
      navigationTitle={connection?.podName ? `Daily Briefing — ${connection.podName}` : "Daily Briefing"}
    >
      {error ? (
        <ConnectionErrorEmptyView error={error} onRetry={retry} />
      ) : isEmpty && !connLoading && !isLoading ? (
        <List.EmptyView
          icon={Icon.Sun}
          title="You're all clear"
          description="No tasks or events due today or this week."
        />
      ) : (
        <>
          {overdueTasks.length > 0 && (
            <List.Section title="Overdue" subtitle={`${overdueTasks.length}`}>
              {overdueTasks.map((task) => (
                <List.Item
                  key={task.id}
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                  title={task.title}
                  subtitle={task.dueDate ? relativeDate(task.dueDate) : undefined}
                  accessories={[
                    { tag: { value: capitalize(task.status ?? "todo"), color: statusColor(task.status ?? "") } },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Sidebar}
                        target={<EntityDetail entityId={task.id} />}
                      />
                      <Action.OpenInBrowser
                        title="Open in Synap"
                        url={openAppUrl("entity", task.id)}
                        icon={Icon.Window}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {todayTasks.length > 0 && (
            <List.Section title="Due Today" subtitle={`${todayTasks.length}`}>
              {todayTasks.map((task) => (
                <List.Item
                  key={task.id}
                  icon={{ source: Icon.Circle, tintColor: Color.Blue }}
                  title={task.title}
                  accessories={[
                    { tag: { value: capitalize(task.status ?? "todo"), color: statusColor(task.status ?? "") } },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Sidebar}
                        target={<EntityDetail entityId={task.id} />}
                      />
                      <Action.OpenInBrowser
                        title="Open in Synap"
                        url={openAppUrl("entity", task.id)}
                        icon={Icon.Window}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {todayEvents.length > 0 && (
            <List.Section title="Today's Events" subtitle={`${todayEvents.length}`}>
              {todayEvents.map((event) => {
                const start = event.properties?.startDate as string | undefined;
                return (
                  <List.Item
                    key={event.id}
                    icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
                    title={event.title}
                    subtitle={start ? relativeDate(start) : undefined}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Details"
                          icon={Icon.Sidebar}
                          target={<EntityDetail entityId={event.id} />}
                        />
                        <Action.OpenInBrowser
                          title="Open in Synap"
                          url={openAppUrl("entity", event.id)}
                          icon={Icon.Window}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}

          {upcomingTasks.length > 0 && (
            <List.Section title="This Week" subtitle={`${upcomingTasks.length} tasks`}>
              {upcomingTasks.map((task) => (
                <List.Item
                  key={task.id}
                  icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
                  title={task.title}
                  subtitle={task.dueDate ? relativeDate(task.dueDate) : undefined}
                  accessories={[
                    { tag: { value: capitalize(task.status ?? "todo"), color: statusColor(task.status ?? "") } },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Sidebar}
                        target={<EntityDetail entityId={task.id} />}
                      />
                      <Action.OpenInBrowser
                        title="Open in Synap"
                        url={openAppUrl("entity", task.id)}
                        icon={Icon.Window}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {upcomingEvents.length > 0 && (
            <List.Section title="Upcoming Events" subtitle={`${upcomingEvents.length}`}>
              {upcomingEvents.map((event) => {
                const start = event.properties?.startDate as string | undefined;
                return (
                  <List.Item
                    key={event.id}
                    icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
                    title={event.title}
                    subtitle={start ? relativeDate(start) : undefined}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Details"
                          icon={Icon.Sidebar}
                          target={<EntityDetail entityId={event.id} />}
                        />
                        <Action.OpenInBrowser
                          title="Open in Synap"
                          url={openAppUrl("entity", event.id)}
                          icon={Icon.Window}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
