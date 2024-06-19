import { Application, getFrontmostApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export const useFrontmostApp = () => {
  return usePromise(
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
