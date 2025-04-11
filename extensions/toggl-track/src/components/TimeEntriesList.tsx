import { ActionPanel, Icon, List } from "@raycast/api";

import { TimeEntry, TimeEntryMetaData } from "@/api";
import { formatSeconds } from "@/helpers/formatSeconds";

interface TimeEntriesListProps {
  isLoading: boolean;
  timeEntries: (TimeEntry & TimeEntryMetaData)[];
  navigationTitle?: string;
  sectionTitle?: string;
  renderActions: (timeEntry: TimeEntry & TimeEntryMetaData) => JSX.Element;
}

export function TimeEntriesList({
  isLoading,
  timeEntries,
  navigationTitle,
  sectionTitle = "Recent time entries",
  renderActions,
}: TimeEntriesListProps) {
  return (
    <List isLoading={isLoading} throttle navigationTitle={navigationTitle}>
      {timeEntries.length > 0 && (
        <List.Section title={sectionTitle}>
          {timeEntries.map((timeEntry) => (
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
              actions={<ActionPanel>{renderActions(timeEntry)}</ActionPanel>}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default TimeEntriesList;
