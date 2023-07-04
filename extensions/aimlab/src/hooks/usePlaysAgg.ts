import { useCachedPromise } from "@raycast/utils";
import getPlaysAgg from "../utils/getPlaysAgg";
import { PlayerAgg } from "../types/playerAgg.types";

interface AggResponse {
  group_by: {
    task_id: string;
    task_name: string;
  };
  aggregate: {
    max: {
      score: number;
    };
    count: number;
  };
}

const usePlaysAgg = (id: string) => {
  return useCachedPromise(
    async (id: string) => {
      const data = await getPlaysAgg(id);

      if (!data) {
        return null;
      }

      const playeragg: PlayerAgg[] = data.map(
        (agg: AggResponse): PlayerAgg => ({
          id: agg.group_by.task_id,
          task_name: agg.group_by.task_name,
          bestScore: agg.aggregate.max.score,
          plays: agg.aggregate.count,
        })
      );
      return playeragg;
    },
    [id]
  );
};

export default usePlaysAgg;
