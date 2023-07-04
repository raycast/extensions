import { useCachedPromise } from "@raycast/utils";
import getSeasons from "../utils/getSeasons";
import { Season, SeasonTasks } from "../types/season.types";

const useSeasons = (activeOnly: boolean) => {
  return useCachedPromise(async () => {
    const data = await getSeasons(activeOnly);

    if (!data) {
      return null;
    }

    const seasons: Season[] = data.map(
      (season: Season): Season => ({
        id: season.id,
        name: season.name,
        description: season.description,
        startDate: season.startDate,
        endDate: season.endDate,
        active: season.active,
        createdAt: season.createdAt,
        updatedAt: season.updatedAt,
        tasks: season.tasks.map(
          (task: SeasonTasks): SeasonTasks => ({
            seasonId: task.seasonId,
            taskId: task.taskId,
            sortOrder: task.sortOrder,
            weaponId: task.weaponId,
            modeId: task.modeId,
          })
        ),
      })
    );

    return seasons;
  }, []);
};

export default useSeasons;
