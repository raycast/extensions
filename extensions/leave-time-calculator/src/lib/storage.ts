import { LocalStorage } from "@raycast/api";

const TODAY_START_TIME_KEY = "todayStartTime";
const TODAY_DATE_KEY = "todayDate";

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getTodayStartTime(): Promise<string | null> {
  const savedDate = await LocalStorage.getItem<string>(TODAY_DATE_KEY);
  const today = getTodayDateString();

  // Clear if it's a different day
  if (savedDate !== today) {
    await LocalStorage.removeItem(TODAY_START_TIME_KEY);
    await LocalStorage.removeItem(TODAY_DATE_KEY);
    return null;
  }

  return (await LocalStorage.getItem<string>(TODAY_START_TIME_KEY)) || null;
}

export async function setTodayStartTime(startTime: string): Promise<void> {
  const today = getTodayDateString();
  await LocalStorage.setItem(TODAY_DATE_KEY, today);
  await LocalStorage.setItem(TODAY_START_TIME_KEY, startTime);
}

export async function clearTodayStartTime(): Promise<void> {
  await LocalStorage.removeItem(TODAY_START_TIME_KEY);
  await LocalStorage.removeItem(TODAY_DATE_KEY);
}
