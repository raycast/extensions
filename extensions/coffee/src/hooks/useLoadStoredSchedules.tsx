import { LocalStorage } from "@raycast/api";
import { Schedule } from "../interfaces";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { numberToDayString, parseSchedule } from "../utils";

const SCHEDULE_REFRESH_INTERVAL_MS = 15_000;

const dayOrder: { [key: string]: number } = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function useLoadStoredSchedules(
  updateSchedules: Dispatch<SetStateAction<Schedule[]>>,
  setIsLoading: (isLoading: boolean) => void,
) {
  // Use refs to avoid re-running the effect when callbacks change
  const updateSchedulesRef = useRef(updateSchedules);
  const setIsLoadingRef = useRef(setIsLoading);

  useEffect(() => {
    updateSchedulesRef.current = updateSchedules;
    setIsLoadingRef.current = setIsLoading;
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSchedulesFromLocalStorage() {
      setIsLoadingRef.current(true);

      try {
        const allStoredItems = await LocalStorage.allItems();

        if (!isMounted) return;

        const schedules: Schedule[] = Object.values(allStoredItems)
          .map(parseSchedule)
          .filter((schedule): schedule is Schedule => schedule !== undefined)
          .sort(compareSchedulesByDay);

        updateSchedulesRef.current(schedules);
      } finally {
        if (isMounted) {
          setIsLoadingRef.current(false);
        }
      }
    }

    async function refreshTodaysSchedule() {
      const currentDay = numberToDayString(new Date().getDay()).toLowerCase();

      try {
        const storedValue = await LocalStorage.getItem(currentDay);
        if (!isMounted) return;

        const storedSchedule = storedValue === undefined ? undefined : parseSchedule(storedValue);

        updateSchedulesRef.current((currentSchedules) => {
          const currentSchedule = currentSchedules.find((schedule) => schedule.day === currentDay);

          if (schedulesEqual(currentSchedule, storedSchedule)) {
            return currentSchedules;
          }

          return [
            ...currentSchedules.filter((schedule) => schedule.day !== currentDay),
            ...(storedSchedule ? [storedSchedule] : []),
          ].sort(compareSchedulesByDay);
        });
      } catch (error) {
        console.error("Failed to refresh today's caffeination schedule:", error);
      }
    }

    void loadSchedulesFromLocalStorage();
    const refreshInterval = setInterval(() => void refreshTodaysSchedule(), SCHEDULE_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []);
}

function compareSchedulesByDay(a: Schedule, b: Schedule): number {
  return (dayOrder[a.day] ?? -1) - (dayOrder[b.day] ?? -1);
}

function schedulesEqual(a: Schedule | undefined, b: Schedule | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;

  return (
    a.day === b.day &&
    a.from === b.from &&
    a.to === b.to &&
    a.IsManuallyDecafed === b.IsManuallyDecafed &&
    a.IsRunning === b.IsRunning
  );
}
