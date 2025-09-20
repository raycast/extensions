import { usePromise } from "@raycast/utils";
import { Application, getFrontmostApplication } from "@raycast/api";

export function useFrontmostApp() {
  return usePromise(() => {
    return getFrontmostApplication() as Promise<Application>;
  });
}
