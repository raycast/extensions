import { LocalStorage } from "@raycast/api";
import { calculateLeaveDate } from "./time-utils";

const TODAY_START_TIME_KEY = "todayStartTime";
const TODAY_DATE_KEY = "todayDate";
const TODAY_DATE_FORMAT_KEY = "todayDateFormat";
const LOCAL_DATE_FORMAT = "local-v1";

export type SavedShift = {
  startTime: string;
  startDate: string;
};

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function clearSavedShift(): Promise<void> {
  await LocalStorage.removeItem(TODAY_START_TIME_KEY);
  await LocalStorage.removeItem(TODAY_DATE_KEY);
  await LocalStorage.removeItem(TODAY_DATE_FORMAT_KEY);
}

export async function getTodayShift(
  workHours: number,
  breakMinutes: number,
): Promise<SavedShift | null> {
  let savedDate = await LocalStorage.getItem<string>(TODAY_DATE_KEY);
  const startTime = await LocalStorage.getItem<string>(TODAY_START_TIME_KEY);

  if (!savedDate || !startTime) {
    return null;
  }

  const dateFormat = await LocalStorage.getItem<string>(TODAY_DATE_FORMAT_KEY);
  if (dateFormat !== LOCAL_DATE_FORMAT) {
    const currentUtcDate = new Date().toISOString().split("T")[0];
    if (savedDate !== currentUtcDate) {
      await clearSavedShift();
      return null;
    }

    savedDate = getLocalDateString(new Date());
    await LocalStorage.setItem(TODAY_DATE_KEY, savedDate);
    await LocalStorage.setItem(TODAY_DATE_FORMAT_KEY, LOCAL_DATE_FORMAT);
  }

  const shiftEndDate = calculateLeaveDate(
    startTime,
    workHours,
    breakMinutes,
    savedDate,
  );
  if (getLocalDateString(new Date()) > getLocalDateString(shiftEndDate)) {
    await clearSavedShift();
    return null;
  }

  return { startTime, startDate: savedDate };
}

export async function setTodayStartTime(
  startTime: string,
): Promise<SavedShift> {
  const today = getLocalDateString(new Date());
  await LocalStorage.setItem(TODAY_DATE_KEY, today);
  await LocalStorage.setItem(TODAY_DATE_FORMAT_KEY, LOCAL_DATE_FORMAT);
  await LocalStorage.setItem(TODAY_START_TIME_KEY, startTime);
  return { startTime, startDate: today };
}

export async function clearTodayStartTime(): Promise<void> {
  await clearSavedShift();
}
