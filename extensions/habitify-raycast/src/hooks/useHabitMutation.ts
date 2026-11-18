import { showToast, Toast } from "@raycast/api";
import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import { formatUTCDate } from "../lib/date";
import { formatHabitifyErrorMessage } from "../lib/errors";
import {
  completeHabit,
  deleteHabitLog,
  fetchHabitLogs,
  logHabitValue,
  skipHabit,
  TodayHabit,
  undoHabit,
} from "../lib/habitify";

type HabitMutationAction = "complete" | "undo" | "skip" | "decrement";

type UseHabitMutationArgs = {
  apiKey: string;
  habitsRef: RefObject<TodayHabit[]>;
  setHabits: Dispatch<SetStateAction<TodayHabit[]>>;
  reload: (options?: { silent?: boolean }) => Promise<void>;
};

export function useHabitMutation({ apiKey, habitsRef, setHabits, reload }: UseHabitMutationArgs) {
  const updateHabitStatus = useCallback(
    (habitId: string, status: TodayHabit["status"]) => {
      setHabits((current) => current.map((habit) => (habit.id === habitId ? { ...habit, status } : habit)));
    },
    [setHabits],
  );

  return useCallback(
    async (habitId: string, habitName: string, action: HabitMutationAction) => {
      const targetDate = formatUTCDate(new Date());
      const rollbackSnapshot = habitsRef.current;

      const toastTitles: Record<HabitMutationAction, string> = {
        complete: "Completing habit…",
        undo: "Undoing habit…",
        skip: "Skipping habit…",
        decrement: "Removing last log…",
      };

      const toastPromise = showToast({
        style: Toast.Style.Animated,
        title: toastTitles[action],
      });

      if (action === "complete") updateHabitStatus(habitId, "completed");
      else if (action === "undo") updateHabitStatus(habitId, "inprogress");
      else if (action === "skip") updateHabitStatus(habitId, "skipped");
      else {
        setHabits((current) =>
          current.map((habit) => {
            if (habit.id !== habitId || !habit.progress) return habit;
            const next = Math.max(0, habit.progress.current - 1);
            return {
              ...habit,
              progress: { ...habit.progress, current: next },
              status: next === 0 ? "inprogress" : habit.status,
            };
          }),
        );
      }

      try {
        if (action === "complete") await completeHabit(apiKey, habitId, targetDate);
        else if (action === "undo") await undoHabit(apiKey, habitId, targetDate);
        else if (action === "skip") await skipHabit(apiKey, habitId, targetDate);
        else {
          const habit = habitsRef.current.find((entry) => entry.id === habitId);
          const logs = await fetchHabitLogs(apiKey, habitId, targetDate);
          if (logs.length > 0) {
            const latest = [...logs].sort((a, b) => b.localLastModifiedDate - a.localLastModifiedDate)[0];
            await deleteHabitLog(apiKey, habitId, latest.id);
          } else {
            await undoHabit(apiKey, habitId, targetDate);
            const current = habit?.progress?.current ?? 0;
            if (current > 1) {
              const unitSymbol = habit?.progress?.unit ?? "";
              await logHabitValue(apiKey, habitId, current - 1, unitSymbol, targetDate);
            }
          }
        }

        const successTitles: Record<HabitMutationAction, string> = {
          complete: "Habit completed",
          undo: "Habit undone",
          skip: "Habit skipped",
          decrement: "Log removed",
        };
        const toast = await toastPromise;
        toast.style = Toast.Style.Success;
        toast.title = successTitles[action];
        toast.message = habitName;
        void reload({ silent: true });
      } catch (err) {
        setHabits(rollbackSnapshot);
        const failTitles: Record<HabitMutationAction, string> = {
          complete: "Could not complete habit",
          undo: "Could not undo habit",
          skip: "Could not skip habit",
          decrement: "Could not remove log",
        };
        const toast = await toastPromise;
        toast.style = Toast.Style.Failure;
        toast.title = failTitles[action];
        toast.message = formatHabitifyErrorMessage(err);
      }
    },
    [apiKey, habitsRef, reload, setHabits, updateHabitStatus],
  );
}
