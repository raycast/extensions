import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { Schedule } from "./utils";

type ActionPanelProps = {
  searchText: string;
  schedule: Schedule;
  onSetScheduleAction: () => void;
  onDeleteScheduleAction: (schedule: Schedule) => void;
  onPauseScheduleAction: (schedule: Schedule) => void;
  onResumeScheduleAction: (schedule: Schedule) => void;
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
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={() => onSetScheduleAction()}
      />
      <Action
        title="Delete Caffeination Schedule"
        style={Action.Style.Destructive}
        icon={Icon.Trash}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={() => onDeleteScheduleAction(schedule)}
      />

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
    </ActionPanel>
  );
}
