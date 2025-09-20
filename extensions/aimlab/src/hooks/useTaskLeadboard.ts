import { useCachedPromise } from "@raycast/utils";
import { Leaderboard, LeaderboardData, Profile } from "../types/leaderboard.types";
import getTaskLeaderboard from "../utils/getTaskLeaderboard";
import { TaskLeaderboard, TaskLeaderboardData } from "../types/taskleaderboard.types";

type PropTypes = {
  taskId: string;
  weaponId: string;
};

const useTaskLeaderboard = ({ taskId, weaponId }: PropTypes) => {
  return useCachedPromise(async () => {
    const data = await getTaskLeaderboard({
      taskId: taskId,
      weaponId: weaponId,
    });

    if (!data) {
      return null;
    }

    const leaderboard: TaskLeaderboard = {
      data: data.data.map(
        (data: TaskLeaderboardData): TaskLeaderboardData => ({
          user_id: data.user_id,
          username: data.username,
          country: data.country,
          score: data.score,
          ended_at: data.ended_at,
          task_duration: data.task_duration,
          targets: data.targets,
          kills: data.kills,
          shots_fired: data.shots_fired,
          shots_hit: data.shots_hit,
          shots_hit_head: data.shots_hit_head,
          shots_hit_body: data.shots_hit_body,
          accuracy: data.accuracy,
          shots_per_kill: data.shots_per_kill,
          time_per_kill: data.time_per_kill,
          custom: data.custom,
          play_id: data.play_id,
          rank: data.rank,
          avg_score: data.avg_score,
        })
      ),
      source: data.source,
      metadata: data.metadata,
    };

    return leaderboard;
  }, []);
};

export default useTaskLeaderboard;
