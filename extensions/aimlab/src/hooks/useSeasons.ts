import { useCachedPromise } from "@raycast/utils";
import getSeasons from "../utils/getSeasons";
import { Season, SeasonTasks } from "../types/season.types";
import getTaskInformation from "../utils/getTaskInformation";

const useSeasons = (activeOnly: boolean) => {
  return useCachedPromise(async () => {
    const data = await getSeasons(activeOnly);

    if (!data) {
      return null;
    }

    const seasons: Season[] = await Promise.all(
      data.map(async (season: Season): Promise<Season> => {
        const tasks = await Promise.all(
          season.tasks.map(async (task: SeasonTasks): Promise<SeasonTasks> => {
            const taskInfo = await getTaskInformation(task.taskId);
            return {
              seasonId: task.seasonId,
              taskId: task.taskId,
              sortOrder: task.sortOrder,
              weaponId: task.weaponId,
              modeId: task.modeId,
              name: taskInfo ? taskInfo.name : "",
            };
          })
        );

        return {
          id: season.id,
          name: season.name,
          description: season.description,
          startDate: season.startDate,
          endDate: season.endDate,
          active: season.active,
          createdAt: season.createdAt,
          updatedAt: season.updatedAt,
          tasks,
        };
      })
    );

    return seasons;
  }, []);
};

export default useSeasons;
