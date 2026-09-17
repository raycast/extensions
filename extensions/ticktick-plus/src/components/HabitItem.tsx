import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { Habit, HabitCheckin } from "../types/ticktick";
import { checkinHabit, uncheckinHabit } from "../api/habits";
import { format, subDays } from "date-fns";

interface Props {
  habit: Habit;
  checkins: HabitCheckin[];
  onCheckin: () => void;
}

function getWeekDays(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), "yyyyMMdd"));
  }
  return days;
}

function streakCount(checkins: HabitCheckin[]): number {
  let streak = 0;
  const today = format(new Date(), "yyyyMMdd");
  const stamps = new Set(checkins.filter((c) => c.status === 2).map((c) => c.stampDate));

  for (let i = 0; i <= 365; i++) {
    const d = format(subDays(new Date(), i), "yyyyMMdd");
    if (d === today && !stamps.has(d)) continue; // today not checked yet is ok
    if (stamps.has(d)) streak++;
    else break;
  }
  return streak;
}

export function HabitItem({ habit, checkins, onCheckin }: Props) {
  const weekDays = getWeekDays();
  const checkedStamps = new Set(checkins.filter((c) => c.status === 2).map((c) => c.stampDate));
  const todayStamp = format(new Date(), "yyyyMMdd");
  const isCheckedToday = checkedStamps.has(todayStamp);
  const streak = streakCount(checkins);

  const weekAccessories: List.Item.Accessory[] = weekDays.map((stamp) => ({
    icon: checkedStamps.has(stamp)
      ? { source: Icon.CheckCircle, tintColor: habit.color ?? Color.Blue }
      : { source: Icon.Circle, tintColor: Color.SecondaryText },
    tooltip: format(new Date(stamp.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")), "EEE MMM d"),
  }));

  if (streak > 0) {
    weekAccessories.push({ text: `🔥 ${streak}`, tooltip: `${streak} day streak` });
  }

  return (
    <List.Item
      key={habit.id}
      icon={{ source: Icon.Star, tintColor: (habit.color as Color) ?? Color.Blue }}
      title={habit.name}
      subtitle={isCheckedToday ? "Done today" : "Not done today"}
      accessories={weekAccessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isCheckedToday ? (
              <Action
                title="Uncheck Today"
                icon={Icon.XMarkCircle}
                onAction={async () => {
                  try {
                    await uncheckinHabit(habit.id);
                    await showToast({ style: Toast.Style.Success, title: "Habit unchecked" });
                    onCheckin();
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to uncheck habit",
                      message: String(err),
                    });
                  }
                }}
              />
            ) : (
              <Action
                title="Check in Today"
                icon={Icon.Checkmark}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={async () => {
                  try {
                    await checkinHabit(habit.id);
                    await showToast({ style: Toast.Style.Success, title: "Habit checked in!" });
                    onCheckin();
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to check in habit",
                      message: String(err),
                    });
                  }
                }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
