import { useCachedPromise } from "@raycast/utils";
import { getApps, getActiveApp } from "./storage";

export const PAGE_SIZE = 50;

export function useApps() {
  return useCachedPromise(getApps, [], { initialData: [] });
}

export function useActiveApp() {
  return useCachedPromise(getActiveApp, []);
}
