import { Action, ActionPanel, Color, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { api, type Habit } from "./lib/client";

const SLOT_TITLES: Record<string, string> = {
  manha: "Morning",
  tarde: "Afternoon",
  noite: "Evening",
  madrugada: "Late Night",
};

export default function Habits() {
  const { data, isLoading, revalidate } = usePromise(api.habits);

  const check = async (habit: Habit, done: boolean, slot?: string) => {
    try {
      await api.checkHabit(habit.id, done, slot);
      revalidate();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update habit",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const habits = data?.habits ?? [];
  const pending = habits.filter((h) => !h.doneToday);
  const done = habits.filter((h) => h.doneToday);

  const item = (h: Habit) => {
    const progress =
      h.targetValue != null
        ? `${h.todayValue}/${h.targetValue}${h.unit ? ` ${h.unit}` : ""}`
        : h.slots.length > 0
          ? `${h.todaySlots.length}/${h.slots.length} slots`
          : null;
    return (
      <List.Item
        key={h.id}
        icon={
          h.doneToday
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.Circle, tintColor: Color.SecondaryText }
        }
        title={h.name}
        subtitle={h.category ?? undefined}
        accessories={[
          ...(progress ? [{ text: progress }] : []),
          ...(h.streak > 0 ? [{ tag: { value: `${h.streak}d streak`, color: Color.Orange } }] : []),
          { text: `${h.weekCount}/${h.target} this week` },
        ]}
        actions={
          <ActionPanel>
            {h.slots.length > 0 ? (
              <ActionPanel.Submenu title="Check Slot" icon={Icon.CheckCircle}>
                {h.slots.map((slot) => {
                  const slotDone = h.todaySlots.includes(slot);
                  return (
                    <Action
                      key={slot}
                      title={`${slotDone ? "Uncheck" : "Check"} ${SLOT_TITLES[slot] ?? slot}`}
                      icon={slotDone ? Icon.CheckCircle : Icon.Circle}
                      onAction={() => void check(h, !slotDone, slot)}
                    />
                  );
                })}
              </ActionPanel.Submenu>
            ) : (
              <Action
                title={h.doneToday ? "Uncheck Habit" : "Check Habit"}
                icon={h.doneToday ? Icon.Circle : Icon.CheckCircle}
                onAction={() => void check(h, !h.doneToday)}
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter habits…">
      {pending.length > 0 && <List.Section title="To Do">{pending.map(item)}</List.Section>}
      {done.length > 0 && <List.Section title="Done Today">{done.map(item)}</List.Section>}
      {!isLoading && habits.length === 0 && (
        <List.EmptyView icon={Icon.BullsEye} title="No active habits" description="Create habits in Arandu first." />
      )}
    </List>
  );
}
