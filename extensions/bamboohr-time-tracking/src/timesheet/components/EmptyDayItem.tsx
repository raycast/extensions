import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { Project, TimesheetEntryInput } from "../../bamboo/api";
import { EditForm } from "./EditForm";
import { Preferences } from "../../preferences";

type EmptyDayItemProps = {
  dayDate: string;
  projects: Project[];
  projectsLoading: boolean;
  isCurrentMonth: boolean;
  preferences: Preferences;
  onSave: (input: TimesheetEntryInput) => Promise<void>;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  onRefresh: () => void;
};

export function EmptyDayItem({
  dayDate,
  projects,
  projectsLoading,
  isCurrentMonth,
  preferences,
  onSave,
  goToPreviousMonth,
  goToNextMonth,
  goToCurrentMonth,
  onRefresh,
}: EmptyDayItemProps) {
  return (
    <List.Item
      key={`empty-${dayDate}`}
      icon={{
        source: Icon.Plus,
        tintColor: "#8E8E93",
      }}
      title="Add Entry"
      accessories={[{ text: "No time entries for this day" }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Add Entry"
              icon={Icon.Plus}
              target={
                <EditForm
                  mode="add"
                  date={dayDate}
                  existingEntries={[]}
                  projects={projects}
                  projectsLoading={projectsLoading}
                  preferences={preferences}
                  onSave={async ({ toCreate }) => {
                    for (const input of toCreate) {
                      await onSave(input);
                    }
                  }}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <Action
              title="Previous Month"
              icon={Icon.ArrowLeft}
              onAction={goToPreviousMonth}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            />
            <Action
              title="Next Month"
              icon={Icon.ArrowRight}
              onAction={goToNextMonth}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
            />
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
