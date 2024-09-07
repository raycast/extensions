import { Action, ActionPanel, Icon } from "@raycast/api";
import { Schedule } from "./utils";

type ActionPanelProps = {
  searchText: string;
  schedule: Schedule;
  onSetScheduleAction: () => void;
  onDeleteScheduleAction: (scheduleDay: string) => void;
  onPauseScheduleAction: (scheduleDay: string) => void;
  onResumeScheduleAction: (scheduleDay: string) => void;
};

export function ListActionPanel({
  searchText,
  schedule,
  onSetScheduleAction,
  onDeleteScheduleAction,
  onPauseScheduleAction,
  onResumeScheduleAction,
}: ActionPanelProps) {
  return (
    <ActionPanel>
      {searchText.length > 0 && <Action title="Set Schedule" icon={Icon.Calendar} onAction={onSetScheduleAction} />}
      <Action
        title="Set Caffeination Schedule"
        icon={Icon.CopyClipboard}
        shortcut={{ modifiers: ["cmd"], key: "enter" }}
        onAction={() => onSetScheduleAction()}
      />
      <Action
        title="Delete Caffeination Schedule"
        style={Action.Style.Destructive}
        icon={Icon.Trash}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onAction={() => onDeleteScheduleAction(schedule.day)}
      />

      {
        schedule.IsManuallyDecafed ? (
          <Action
            title="Resume Caffeination Schedule"
            icon={Icon.Play}
            onAction={() => onResumeScheduleAction(schedule.day)}
          />
        ) : (
          <Action
            title="Pause Caffeination Schedule"
            icon={Icon.Pause}
            onAction={() => onPauseScheduleAction(schedule.day)}
          />
        )
      }

    </ActionPanel>
  );
}
