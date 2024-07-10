import { ActionPanel, Icon, List, Action } from "@raycast/api";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import TimeEntryForm from "@/components/CreateTimeEntryForm";
import RunningTimeEntry from "@/components/RunningTimeEntry";
import { ExtensionContextProvider } from "@/context/ExtensionContext";
import { formatSeconds } from "@/helpers/formatSeconds";
import { useProcessedTimeEntries } from "@/hooks/useProcessedTimeEntries";
import { useTimeEntryActions } from "@/hooks/useTimeEntryActions";
import { useTotalDurationToday } from "@/hooks/useTotalDurationToday";

dayjs.extend(duration);

function ListView() {
  const { timeEntries, runningTimeEntry, isLoading, timeEntriesWithUniqueProjectAndDescription } =
    useProcessedTimeEntries();

  const totalDurationToday = useTotalDurationToday(timeEntries, runningTimeEntry);
  const { resumeTimeEntry } = useTimeEntryActions();

  return (
    <List
      isLoading={isLoading}
      throttle
      navigationTitle={isLoading ? undefined : `Today: ${formatSeconds(totalDurationToday)}`}
    >
      {runningTimeEntry && <RunningTimeEntry runningTimeEntry={runningTimeEntry} />}
      <List.Section title="Actions">
        <List.Item
          title="Create a new time entry"
          icon={"command-icon.png"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Time Entry"
                icon={{ source: Icon.Clock }}
                target={
                  <ExtensionContextProvider>
                    <TimeEntryForm />
                  </ExtensionContextProvider>
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {timeEntriesWithUniqueProjectAndDescription.length > 0 && (
        <List.Section title="Recent time entries">
          {timeEntriesWithUniqueProjectAndDescription.map((timeEntry) => (
            <List.Item
              key={timeEntry.id}
              keywords={[timeEntry.description, timeEntry.project_name || "", timeEntry.client_name || ""]}
              title={timeEntry.description || "No description"}
              subtitle={(timeEntry.client_name ? timeEntry.client_name + " | " : "") + (timeEntry.project_name ?? "")}
              accessories={[...timeEntry.tags.map((tag) => ({ tag })), { text: timeEntry.billable ? "$" : "" }]}
              icon={{ source: Icon.Circle, tintColor: timeEntry.project_color }}
              actions={
                <ActionPanel>
                  <Action.SubmitForm
                    title="Resume Time Entry"
                    onSubmit={() => resumeTimeEntry(timeEntry)}
                    icon={{ source: Icon.Clock }}
                  />
                  <Action.Push
                    title="Create Similar Time Entry"
                    icon={{ source: Icon.Plus }}
                    target={
                      <ExtensionContextProvider>
                        <TimeEntryForm initialValues={timeEntry} />
                      </ExtensionContextProvider>
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  return (
    <ExtensionContextProvider>
      <ListView />
    </ExtensionContextProvider>
  );
}
