// utils/storage.ts
import { LocalStorage } from "@raycast/api";
import { FocusLog } from "../types";
import { STORAGE_KEYS } from "./constants";

export const getFocusLog = async (): Promise<FocusLog | null> => {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.FOCUS_LOG);
  return data ? JSON.parse(data) : null;
};

export const saveFocusLog = async (focusLog: FocusLog): Promise<void> => {
  await LocalStorage.setItem(STORAGE_KEYS.FOCUS_LOG, JSON.stringify(focusLog));
};

export const getPersonalBest = async (): Promise<number | null> => {
  const best = await LocalStorage.getItem<string>(STORAGE_KEYS.PERSONAL_BEST);
  return best ? Number(best) : null;
};

export const savePersonalBest = async (time: number): Promise<void> => {
  await LocalStorage.setItem(STORAGE_KEYS.PERSONAL_BEST, time.toString());
};
