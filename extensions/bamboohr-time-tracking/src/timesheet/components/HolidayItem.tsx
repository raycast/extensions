import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { Project, TimesheetEntryInput } from "../../bamboo/api";
import { DayOffInfo } from "../../helpers";
import { EditForm } from "./EditForm";
import { Preferences } from "../../preferences";

type HolidayItemProps = {
  dayOff: DayOffInfo;
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

export function HolidayItem({
  dayOff,
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
}: HolidayItemProps) {
  return (
    <List.Item
      key={`dayoff-${dayDate}`}
      icon={{
        source: dayOff.type === "holiday" ? Icon.Calendar : Icon.Sun,
        tintColor: "#8E8E93",
      }}
      title={dayOff.name}
      subtitle={
        dayOff.type === "holiday" ? "Company Holiday" : "Personal Time Off"
      }
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
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "arrowLeft" },
                Windows: { modifiers: ["ctrl"], key: "arrowLeft" },
              }}
            />
            <Action
              title="Next Month"
              icon={Icon.ArrowRight}
              onAction={goToNextMonth}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "arrowRight" },
                Windows: { modifiers: ["ctrl"], key: "arrowRight" },
              }}
            />
            {!isCurrentMonth ? (
              <Action
                title="Current Month"
                icon={Icon.Calendar}
                onAction={goToCurrentMonth}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "t" },
                  Windows: { modifiers: ["ctrl"], key: "t" },
                }}
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
