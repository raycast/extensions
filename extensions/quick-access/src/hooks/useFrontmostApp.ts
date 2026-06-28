import { getFrontmostApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export const useFrontmostApp = () => {
  return usePromise(() => {
    return getFrontmostApplication();
  }, []);
};
