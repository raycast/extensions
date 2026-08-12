import { usePromise } from "@raycast/utils";
import { getFrontmostApplication } from "@raycast/api";

export function useFrontmostApp() {
  return usePromise(async () => {
    try {
      return await getFrontmostApplication();
    } catch {
      return undefined;
    }
  });
}
