import { LocalStorage } from "@raycast/api";
import { Schedule } from "../interfaces";
import { useEffect, useRef } from "react";

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
  updateSchedules: (schedules: Schedule[]) => void,
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

      const allStoredItems = await LocalStorage.allItems();

      if (!isMounted) return;

      const schedules: Schedule[] = Object.values(allStoredItems).map((item) => JSON.parse(item) as Schedule);

      if (schedules.length > 0) {
        schedules.sort((a, b) => (dayOrder[a.day] ?? -1) - (dayOrder[b.day] ?? -1));

        updateSchedulesRef.current(schedules);
      }

      setIsLoadingRef.current(false);
    }

    void loadSchedulesFromLocalStorage();

    return () => {
      isMounted = false;
    };
  }, []);
}
