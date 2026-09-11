import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import {
  habitProgressLabel,
  habitStatusLabel,
  resolveRowTint,
  statusIcon,
  statusTintColor,
  streakIcon,
  TodayHabit,
} from "../lib/habitify";
import HabitDetail from "./HabitDetail";
import LogAmountForm from "./LogAmountForm";

type HabitMutationAction = "complete" | "undo" | "skip" | "decrement";

type Props = {
  habit: TodayHabit;
  apiKey: string;
  rowColorMode: Preferences["rowColorMode"];
  onMutate: (habitId: string, habitName: string, action: HabitMutationAction) => void;
  onRefresh: () => void;
  showTimeOfDay?: boolean;
};

export default function HabitListItem({
  habit,
  apiKey,
  rowColorMode,
  onMutate,
  onRefresh,
  showTimeOfDay = false,
}: Props) {
  const detail = habitProgressLabel(habit);
  const accessories: List.Item.Accessory[] = [
    {
      text: habitStatusLabel(habit.status),
      icon: {
        source: statusIcon(habit.status),
        tintColor: statusTintColor(habit.status),
      },
    },
  ];
  const rowTint = resolveRowTint(habit, rowColorMode);

  if (habit.currentStreak) {
    accessories.push({
      text: `${habit.currentStreak.length}d`,
      icon: streakIcon(),
    });
  }

  if (showTimeOfDay && habit.currentTimeOfDay) {
    accessories.push({
      text: habit.currentTimeOfDay.name,
      icon: { source: Icon.Clock },
    });
  }

  return (
    <List.Item
      key={habit.id}
      title={habit.name}
      subtitle={detail}
      icon={rowTint ? { source: statusIcon(habit.status), tintColor: rowTint } : statusIcon(habit.status)}
      accessories={accessories}
      actions={
        <ActionPanel title={habit.name}>
          {habit.status === "completed" ? (
            <Action
              title="Undo Today"
              icon={Icon.ArrowCounterClockwise}
              onAction={() => void onMutate(habit.id, habit.name, "undo")}
            />
          ) : (
            <Action
              title="Mark Completed"
              icon={{ source: Icon.CheckCircle, tintColor: "#20B26B" }}
              onAction={() => void onMutate(habit.id, habit.name, "complete")}
            />
          )}
          {habit.progress && (
            <Action.Push
              title="Log Amount"
              icon={Icon.Plus}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "l" },
                Windows: { modifiers: ["ctrl"], key: "l" },
              }}
              target={<LogAmountForm habit={habit} apiKey={apiKey} onSuccess={onRefresh} />}
            />
          )}
          {habit.status === "inprogress" && (
            <Action
              title="Skip"
              icon={Icon.ArrowRight}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={() => void onMutate(habit.id, habit.name, "skip")}
            />
          )}
          {habit.progress && habit.progress.current > 0 && (
            <Action
              title="Remove Last Log"
              icon={Icon.Minus}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "backspace" },
                Windows: { modifiers: ["ctrl", "shift"], key: "backspace" },
              }}
              onAction={() => void onMutate(habit.id, habit.name, "decrement")}
            />
          )}
          <Action.Push
            title="View Statistics"
            icon={Icon.BarChart}
            target={<HabitDetail apiKey={apiKey} habitId={habit.id} habitName={habit.name} onRefresh={onRefresh} />}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action.CopyToClipboard title="Copy Habit ID" content={habit.id} />
        </ActionPanel>
      }
    />
  );
}
