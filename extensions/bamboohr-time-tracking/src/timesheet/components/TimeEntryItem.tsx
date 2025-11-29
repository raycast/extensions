import { ActionPanel, Action, Icon, List } from "@raycast/api";
import {
  NormalizedTimeEntry,
  Project,
  TimesheetEntryInput,
  formatDuration,
} from "../../bamboo/api";
import {
  entryDurationMs,
  hasWarningsForEntry,
  formatTimeRange,
} from "../../helpers";
import { Preferences } from "../../preferences";
import { EditForm } from "./EditForm";

type TimeEntryItemProps = {
  entry: NormalizedTimeEntry;
  dayDate: string;
  dayEntries: NormalizedTimeEntry[]; // All entries for this day
  index: number;
  preferences: Preferences;
  splitGapMs: number;
  projects: Project[];
  projectsLoading: boolean;
  isCurrentMonth: boolean;
  onSave: (
    input: TimesheetEntryInput,
    entry?: NormalizedTimeEntry,
  ) => Promise<void>;
  onDelete: (entry: NormalizedTimeEntry) => Promise<void>;
  onDaySave: (data: {
    toCreate: TimesheetEntryInput[];
    toUpdate: { id: string; input: TimesheetEntryInput }[];
    toDelete: string[];
  }) => Promise<void>;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  onRefresh: () => void;
};

export function TimeEntryItem({
  entry,
  dayDate,
  dayEntries,
  index,
  preferences,
  splitGapMs,
  projects,
  projectsLoading,
  isCurrentMonth,
  onSave,
  onDelete,
  onDaySave,
  goToPreviousMonth,
  goToNextMonth,
  goToCurrentMonth,
  onRefresh,
}: TimeEntryItemProps) {
  const timeRange = formatTimeRange(entry);
  const durationMs = entryDurationMs(entry);
  const duration = durationMs ? formatDuration(durationMs) : undefined;
  const hasWarning = hasWarningsForEntry(entry, preferences);
  const hasProject = entry.projectName != undefined;

  const accessories: List.Item.Accessory[] = [];
  if (hasWarning) {
    accessories.push({
      icon: { source: Icon.Warning, tintColor: "#FF6B35" },
      tooltip: "Extended work period",
    });
  }
  if (hasProject) {
    accessories.push({ text: `${entry.projectName}` });
  }
  if (duration) {
    accessories.push({ text: duration });
  }

  return (
    <List.Item
      key={
        entry.id ??
        `${dayDate}-${entry.start?.getTime() ?? entry.end?.getTime() ?? index}`
      }
      icon={{
        source: Icon.Clock,
        tintColor: "#8E8E93",
      }}
      title={timeRange}
      subtitle={entry.note}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Entry"
              icon={Icon.Pencil}
              target={
                <EditForm
                  mode="edit"
                  date={dayDate}
                  existingEntries={[entry]}
                  targetEntry={entry}
                  projects={projects}
                  projectsLoading={projectsLoading}
                  preferences={preferences}
                  onSave={onDaySave}
                />
              }
            />
            {entry.start && entry.end && (
              <Action.Push
                title="Split Entry"
                icon={Icon.ArrowsExpand}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                target={
                  <EditForm
                    mode="split"
                    date={dayDate}
                    existingEntries={dayEntries}
                    targetEntry={entry}
                    splitGapMs={splitGapMs}
                    projects={projects}
                    projectsLoading={projectsLoading}
                    preferences={preferences}
                    onSave={async ({ toCreate, toUpdate, toDelete }) => {
                      for (const id of toDelete) {
                        const entryToDelete = { id } as NormalizedTimeEntry;
                        await onDelete(entryToDelete);
                      }
                      for (const { id, input } of toUpdate) {
                        const entryToUpdate = { id } as NormalizedTimeEntry;
                        await onSave(input, entryToUpdate);
                      }
                      for (const input of toCreate) {
                        await onSave(input);
                      }
                    }}
                  />
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Day"
              icon={Icon.Calendar}
              target={
                <EditForm
                  mode="editDay"
                  date={dayDate}
                  existingEntries={dayEntries}
                  projects={projects}
                  projectsLoading={projectsLoading}
                  preferences={preferences}
                  onSave={onDaySave}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action.Push
              title="Add Entry"
              icon={Icon.Plus}
              target={
                <EditForm
                  mode="add"
                  date={dayDate}
                  existingEntries={dayEntries}
                  projects={projects}
                  projectsLoading={projectsLoading}
                  preferences={preferences}
                  onSave={onDaySave}
                />
              }
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="Delete Entry"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => void onDelete(entry)}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <Action
              title="Previous Month"
              icon={Icon.ArrowLeft}
              onAction={goToPreviousMonth}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            />
            {!isCurrentMonth ? (
              <Action
                title="Next Month"
                icon={Icon.ArrowRight}
                onAction={goToNextMonth}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              />
            ) : null}
            {!isCurrentMonth ? (
              <Action
                title="Current Month"
                icon={Icon.Calendar}
                onAction={goToCurrentMonth}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            ) : null}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => void onRefresh()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
