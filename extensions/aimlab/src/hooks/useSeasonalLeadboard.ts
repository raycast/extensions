import { useCachedPromise } from "@raycast/utils";
import getSeasonalLeaderboard from "../utils/getSeasonalLeaderboard";
import { Leaderboard, LeaderboardData, Profile } from "../types/leaderboard.types";

type PropTypes = {
  seasonId: string;
  taskId: string;
  weaponId: string;
  modeId: number;
};

const useSeasonalLeaderboard = ({ seasonId, taskId, weaponId, modeId }: PropTypes) => {
  return useCachedPromise(async () => {
    const data = await getSeasonalLeaderboard({
      seasonId: seasonId,
      taskId: taskId,
      weaponId: weaponId,
      modeId: modeId,
    });

    if (!data) {
      return null;
    }

    const leaderboard: Leaderboard = {
      profiles: data.profiles.map(
        (profile: Profile): Profile => ({
          username: profile.username,
          rank: profile.rank,
        })
      ),
      data: data.data.map(
        (data: LeaderboardData): LeaderboardData => ({
          user_id: data.user_id,
          username: data.username,
          countries: data.countries,
          total_score: data.total_score,
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

export default useSeasonalLeaderboard;
