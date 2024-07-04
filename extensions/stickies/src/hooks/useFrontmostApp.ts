import { Application, getFrontmostApplication } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export const useFrontmostApp = () => {
  return useCachedPromise(
    () => async () => {
      const apps: Application[] = [];
      try {
        const app = await getFrontmostApplication();
        apps.push(app);
        return { data: apps };
      } catch (e) {
        console.error(String(e));
      }
      return { data: apps };
    },
    [],
  );
};
