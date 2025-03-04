import { useCachedPromise } from "@raycast/utils";
import { Application, getFrontmostApplication } from "@raycast/api";

export function useFrontmostApp() {
  return useCachedPromise(() => {
    return getFrontmostApplication() as Promise<Application>;
  });
}
