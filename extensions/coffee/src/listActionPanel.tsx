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
        title="Set Caffeination schedule"
        icon={Icon.CopyClipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={() => onSetScheduleAction()}
      />
      <Action
        title="Delete Caffeination schedule"
        style={Action.Style.Destructive}
        icon={Icon.Trash}
        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
        onAction={() => onDeleteScheduleAction(schedule.day)}
      />
      <Action
        title="Pause Caffeination schedule"
        style={Action.Style.Destructive}
        icon={Icon.Pause}
        onAction={() => onPauseScheduleAction(schedule.day)}
      />
      <Action
        title="Resume Caffeination schedule"
        icon={Icon.Play}
        onAction={() => onResumeScheduleAction(schedule.day)}
      />
    </ActionPanel>
  );
}
