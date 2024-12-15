import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List } from "@raycast/api";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { removeTimeEntry } from "@/api/timeEntries";
import TimeEntryForm from "@/components/CreateTimeEntryForm";
import RunningTimeEntry from "@/components/RunningTimeEntry";
import UpdateTimeEntryForm from "@/components/UpdateTimeEntryForm";
import { ExtensionContextProvider } from "@/context/ExtensionContext";
import { formatSeconds } from "@/helpers/formatSeconds";
import Shortcut from "@/helpers/shortcuts";
import { Verb, withToast } from "@/helpers/withToast";
import { useProcessedTimeEntries } from "@/hooks/useProcessedTimeEntries";
import { useTimeEntryActions } from "@/hooks/useTimeEntryActions";
import { useTotalDurationToday } from "@/hooks/useTotalDurationToday";

dayjs.extend(duration);

function ListView() {
  const {
    isLoading,
    mutateTimeEntries,
    revalidateRunningTimeEntry,
    revalidateTimeEntries,
    runningTimeEntry,
    timeEntries,
    timeEntriesWithUniqueProjectAndDescription,
  } = useProcessedTimeEntries();

  const totalDurationToday = useTotalDurationToday(timeEntries, runningTimeEntry);
  const { resumeTimeEntry } = useTimeEntryActions(revalidateRunningTimeEntry, revalidateTimeEntries);

  return (
    <List
      isLoading={isLoading}
      throttle
      navigationTitle={isLoading ? undefined : `Today: ${formatSeconds(totalDurationToday)}`}
    >
      {runningTimeEntry && (
        <RunningTimeEntry
          runningTimeEntry={runningTimeEntry}
          revalidateRunningTimeEntry={revalidateRunningTimeEntry}
          revalidateTimeEntries={revalidateTimeEntries}
        />
      )}
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
                    <TimeEntryForm
                      revalidateRunningTimeEntry={revalidateRunningTimeEntry}
                      revalidateTimeEntries={revalidateTimeEntries}
                    />
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
              accessories={[
                { text: formatSeconds(timeEntry.duration) },
                ...timeEntry.tags.map((tag) => ({ tag })),
                timeEntry.billable ? { tag: { value: "$" } } : {},
              ]}
              icon={{ source: Icon.Circle, tintColor: timeEntry.project_color }}
              actions={
                <ActionPanel>
                  <Action.SubmitForm
                    title="Resume Time Entry"
                    onSubmit={() => resumeTimeEntry(timeEntry)}
                    icon={{ source: Icon.Clock }}
                  />
                  <Action.Push
                    title="Edit Time Entry"
                    icon={Icon.Pencil}
                    target={
                      <ExtensionContextProvider>
                        <UpdateTimeEntryForm timeEntry={timeEntry} revalidateTimeEntries={revalidateTimeEntries} />
                      </ExtensionContextProvider>
                    }
                  />
                  <Action.Push
                    title="Create Similar Time Entry"
                    icon={{ source: Icon.Plus }}
                    shortcut={Shortcut.Duplicate}
                    target={
                      <ExtensionContextProvider>
                        <TimeEntryForm
                          initialValues={timeEntry}
                          revalidateRunningTimeEntry={revalidateRunningTimeEntry}
                          revalidateTimeEntries={revalidateTimeEntries}
                        />
                      </ExtensionContextProvider>
                    }
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Delete Time Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={async () => {
                        await confirmAlert({
                          title: "Delete Time Entry",
                          message: "Are you sure you want to delete this time entry?",
                          icon: {
                            source: Icon.Trash,
                            tintColor: Color.Red,
                          },
                          primaryAction: {
                            title: "Delete",
                            style: Alert.ActionStyle.Destructive,
                            onAction: () => {
                              withToast({
                                noun: "Time Entry",
                                verb: Verb.Delete,
                                action: async () => {
                                  await mutateTimeEntries(removeTimeEntry(timeEntry.workspace_id, timeEntry.id));
                                },
                              });
                            },
                          },
                        });
                      }}
                    />
                  </ActionPanel.Section>
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
