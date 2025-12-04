import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export function useDrinkDelay() {
  return useCachedState<number>("delay", 0);
}

export function useLastDrinkedAt() {
  const [lastDrinkedAt, setLastDrinkedAt] = useCachedState<Date | null>("lastDrinkedAt", null);
  const [, setDelay] = useDrinkDelay();

  const drinkNow = () => {
    setLastDrinkedAt(new Date());
    setDelay(0);
  };

  return [lastDrinkedAt, drinkNow] as const;
}

export function useDrinkTimes() {
  const preferences = getPreferenceValues<Preferences>();
  const [lastDrinkedAt] = useLastDrinkedAt();
  const [delay] = useDrinkDelay();
  const interval = Number(preferences.interval ?? "15");

  if (lastDrinkedAt === null) {
    return { interval, nextDrinkReminder: null, lastDrinkFromNowInMinutes: null };
  }

  const lastDrinkFromNow = lastDrinkedAt ? new Date().getTime() - delay - lastDrinkedAt.getTime() : 0;
  const lastDrinkFromNowInMinutes = Math.floor(lastDrinkFromNow / 1000 / 60);

  return { interval, nextDrinkReminder: interval - lastDrinkFromNowInMinutes, lastDrinkFromNowInMinutes };
}

export function pluralize(value: number, unit: string) {
  return value === 1 ? unit : `${unit}s`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
