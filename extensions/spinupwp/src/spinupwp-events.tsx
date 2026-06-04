import { ActionPanel, Action, List, Icon, showToast, Toast, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getEvents } from "./api";
import { Event } from "./types";
import AccountDropdown from "./components/AccountDropdown";

function getStatusIcon(event: Event): { source: Icon; tintColor: Color } {
  if (event.status === "deployed") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (event.status === "failed") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  if (event.status === "queued") {
    return { source: Icon.Circle, tintColor: Color.Orange };
  }
  // creating, updating, deleting are in-progress statuses
  return { source: Icon.Clock, tintColor: Color.Yellow };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatDuration(event: Event): string | null {
  if (!event.started_at || !event.finished_at) return null;
  const start = new Date(event.started_at).getTime();
  const end = new Date(event.finished_at).getTime();
  const durationMs = end - start;

  // Return null if duration is negative (invalid data)
  if (durationMs < 0) return null;

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
  return `${Math.round(durationMs / 60000)}m`;
}

export default function Command() {
  const { data: events, isLoading, error, revalidate } = useCachedPromise(getEvents);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load events",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search events..."
      searchBarAccessory={<AccountDropdown onAccountChange={revalidate} />}
    >
      <List.EmptyView
        title={error ? "Failed to load events" : "No events found"}
        description={error ? error.message : "No events have been recorded yet"}
        icon={error ? Icon.XMarkCircle : Icon.List}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open SpinupWP Dashboard" url="https://spinupwp.app" />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
      {events?.map((event) => {
        const duration = formatDuration(event);
        return (
          <List.Item
            key={event.id}
            title={event.name}
            subtitle={event.initiated_by}
            icon={getStatusIcon(event)}
            accessories={[
              ...(duration
                ? [
                    {
                      text: duration,
                      tooltip: "Duration",
                    },
                  ]
                : []),
              {
                text: formatDate(event.created_at),
                tooltip: "Created at",
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
