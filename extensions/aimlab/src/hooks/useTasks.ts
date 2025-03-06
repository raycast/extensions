import { useCachedPromise } from "@raycast/utils";
import getTasks from "../utils/getTasks";
import { Task } from "../types/tasks.types";

const useTasks = (slug: string) => {
  return useCachedPromise(
    async (slug: string) => {
      const data = await getTasks(slug);

      if (!data) {
        return null;
      }

      const tasks: Task[] = data.map((data: any) => ({
        id: data.id,
        name: data.name,
        weapon_id: data.weapon_id,
        description: data.description,
        image_url: data.image_url,
        author: data.author,
      }));

      return tasks;
    },
    [slug]
  );
};

export default useTasks;
