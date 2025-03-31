import { LocalStorage } from "@raycast/api";
import { Schedule } from "./utils";
import { useEffect } from "react";

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
  useEffect(() => {
    async function loadSchedulesFromLocalStorage() {
      setIsLoading(true);

      const allStoredItems = await LocalStorage.allItems();
      const schedules: Schedule[] = Object.values(allStoredItems).map((item) => JSON.parse(item) as Schedule);

      if (schedules.length > 0) {
        schedules.sort((a, b) => (dayOrder[a.day] ?? -1) - (dayOrder[b.day] ?? -1));

        updateSchedules(schedules);
      }

      setIsLoading(false);
    }

    void loadSchedulesFromLocalStorage();
  }, [updateSchedules]);
}
