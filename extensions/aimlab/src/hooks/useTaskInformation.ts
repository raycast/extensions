import { useCachedPromise } from "@raycast/utils";
import getTaskInformation from "../utils/getTaskInformation";
import { TaskInformation } from "../types/taskinformation.types";

const useTaskInformation = (slug: string) => {
  return useCachedPromise(
    async (slug: string) => {
      const data = await getTaskInformation(slug);

      if (!data) {
        return null;
      }

      const task: TaskInformation = {
        id: data.id,
        name: data.name,
      };

      return task;
    },
    [slug]
  );
};

export default useTaskInformation;
