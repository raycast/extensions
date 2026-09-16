import { useFetch } from "@raycast/utils";
import type { TodayMenu, WeekMenu } from "./types";

export const API_BASE_URL = "https://backend-mess-menu-nust.vercel.app";
export const SITE_URL = "https://mess-menu-six.vercel.app/";
export const WEEKLY_SITE_URL = "https://mess-menu-six.vercel.app/weekly";

export function useTodayMenu() {
  return useFetch<TodayMenu>(`${API_BASE_URL}/api/menu/today`);
}

export function useWeekMenu() {
  return useFetch<WeekMenu>(`${API_BASE_URL}/api/menu/week`);
}

export async function fetchTodayMenu(): Promise<TodayMenu> {
  const response = await fetch(`${API_BASE_URL}/api/menu/today`);
  if (!response.ok) {
    throw new Error(`Couldn't load today's menu. HTTP ${response.status}`);
  }
  return (await response.json()) as TodayMenu;
}
