import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { Schedule } from "../interfaces";

type ActionPanelProps = {
  schedule: Schedule;
  onSetScheduleAction: () => void;
  onDeleteScheduleAction: (schedule: Schedule) => void;
  onPauseScheduleAction: (schedule: Schedule) => void;
  onResumeScheduleAction: (schedule: Schedule) => void;
};

export function ListActionPanel({
  schedule,
  onSetScheduleAction,
  onDeleteScheduleAction,
  onPauseScheduleAction,
  onResumeScheduleAction,
}: ActionPanelProps) {
  return (
    <ActionPanel>
      <Action title="Set Caffeination Schedule" icon={Icon.Calendar} onAction={onSetScheduleAction} />
      {schedule.IsManuallyDecafed ? (
        <Action
          title="Resume Caffeination Schedule"
          icon={Icon.Play}
          onAction={() => onResumeScheduleAction(schedule)}
        />
      ) : (
        <Action
          title="Pause Caffeination Schedule"
          icon={Icon.Pause}
          onAction={() => onPauseScheduleAction(schedule)}
        />
      )}
      <Action
        title="Delete Caffeination Schedule"
        style={Action.Style.Destructive}
        icon={Icon.Trash}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={() => onDeleteScheduleAction(schedule)}
      />
    </ActionPanel>
  );
}
