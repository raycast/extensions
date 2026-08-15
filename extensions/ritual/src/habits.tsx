import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { checkInHabit, listHabits } from "./api/habits";
import type { RitualHabit } from "./api/types";
import { EmptyState } from "./components/EmptyState";
import { resolveCli } from "./preferences";

const SLOTS = ["morning", "night", "anytime"] as const;

export default function Habits() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    () => listHabits(resolveCli()),
    [],
    {
      initialData: [],
      keepPreviousData: true,
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Ritual",
          message: error.message,
        });
      },
    },
  );

  async function checkIn(habit: RitualHabit) {
    try {
      const result = await checkInHabit(resolveCli(), habit.id, habit.slot);
      revalidate();
      // `changed` was ignored here entirely, so checking in something already
      // checked in reported success.
      await showToast({
        style: result.changed ? Toast.Style.Success : Toast.Style.Failure,
        title: result.changed ? "Checked in" : "Already checked in",
        message: habit.title,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't check in",
        message: (e as Error).message,
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter today's habits">
      {SLOTS.map((slot) => {
        const rows = (data ?? []).filter((h) => h.slot === slot);
        if (rows.length === 0) return null;
        return (
          <List.Section
            key={slot}
            title={slot[0].toUpperCase() + slot.slice(1)}
          >
            {rows.map((habit) => (
              // A habit in two routines yields two rows; the id alone would
              // collide, which is why the CLI keys them by habit AND slot.
              <List.Item
                key={`${habit.id}-${habit.slot}`}
                icon={
                  habit.doneToday
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : Icon.Circle
                }
                title={habit.title}
                accessories={
                  habit.weekTarget > 1
                    ? [
                        {
                          tag: {
                            value: `${habit.weekDone}/${habit.weekTarget} this week`,
                          },
                        },
                      ]
                    : []
                }
                actions={
                  <ActionPanel>
                    {!habit.doneToday && (
                      <Action
                        title="Check In"
                        icon={Icon.CheckCircle}
                        onAction={() => checkIn(habit)}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Title"
                      content={habit.title}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
      <EmptyState
        error={error}
        emptyTitle="No routine habits today"
        emptyIcon={Icon.Sunrise}
      />
    </List>
  );
}
