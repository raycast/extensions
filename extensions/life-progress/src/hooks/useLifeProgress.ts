import { usePromise } from "@raycast/utils";
import { LocalStorage } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import { CountdownDate, LifeProgressType } from "../types/types";
import { getLifeProgress } from "../utils/life-progress-utils";

async function buildLifeProgress(): Promise<LifeProgressType[]> {
  try {
    const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.COUNTDOWN_DATE_KEY);
    const localCountdownDates: CountdownDate[] = typeof localStorage !== "undefined" ? JSON.parse(localStorage) : [];
    const { lifeProgresses } = getLifeProgress(localCountdownDates);
    return lifeProgresses;
  } catch (error) {
    console.error("Failed to fetch life progress:", error);
    return [];
  }
}

export function useLifeProgress() {
  return usePromise(() => {
    return buildLifeProgress();
  }, []);
}
