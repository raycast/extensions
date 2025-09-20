import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert } from "@raycast/api";

import { removeTimeEntry } from "@/api";
import { ExtensionContextProvider } from "@/context/ExtensionContext";
import { formatSeconds } from "@/helpers/formatSeconds";
import { Verb, withToast } from "@/helpers/withToast";
import { useProcessedTimeEntries } from "@/hooks/useProcessedTimeEntries";
import { useTotalDurationToday } from "@/hooks/useTotalDurationToday";

import UpdateTimeEntryForm from "./UpdateTimeEntryForm";

export function TimeEntriesListView() {
  const {
    isLoading,
    mutateTimeEntries,
    timeEntries,
    timeEntriesWithUniqueProjectAndDescription,
    revalidateTimeEntries,
  } = useProcessedTimeEntries();

  const totalDurationToday = useTotalDurationToday(timeEntries);

  return (
    <List
      isLoading={isLoading}
      throttle
      navigationTitle={isLoading ? undefined : `Total: ${formatSeconds(totalDurationToday)}`}
    >
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
                  <Action.Push
                    title="Edit Time Entry"
                    icon={Icon.Pencil}
                    target={
                      <ExtensionContextProvider>
                        <UpdateTimeEntryForm timeEntry={timeEntry} revalidateTimeEntries={revalidateTimeEntries} />
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
                          icon: { source: Icon.Trash, tintColor: Color.Red },
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

export default TimeEntriesListView;
