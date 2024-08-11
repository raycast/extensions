import { LocalStorage } from "@raycast/api";
import { Schedule } from "./utils";
import { useEffect } from "react";

export function useLoadStoredSchedules(
  updateSchedules: (schedules: Schedule[]) => void,
  setIsLoading: (isLoading: boolean) => void,
  timestamp: number,
) {
  useEffect(() => {
    async function loadSchedulesFromLocalStorage() {
      setIsLoading(true);

      const allStoredItems = await LocalStorage.allItems();
      const schedules: Schedule[] = Object.values(allStoredItems).map((item) =>
        JSON.parse(item) as Schedule
      );

      if (schedules.length > 0) {
        updateSchedules(schedules);
      }

      setIsLoading(false);
    }

    void loadSchedulesFromLocalStorage();
  }, [timestamp]);
}
