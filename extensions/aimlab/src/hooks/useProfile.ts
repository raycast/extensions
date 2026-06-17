import { useCachedPromise } from "@raycast/utils";
import getProfile from "../utils/getProfile";
import type { Player, SkillScores } from "../types/player.types";

const useProfile = (username: string) => {
  return useCachedPromise(
    async (username: string) => {
      if (!username) {
        return null;
      }

      const data = await getProfile(username);

      if (!data) {
        return null;
      }

      const player: Player = {
        id: data.user.id,
        username: data.username,
        ranking: {
          rank: data.ranking.rank,
          skill: data.ranking.skill,
        },
        skillScores: data.skillScores.map(
          (skillScore: SkillScores): SkillScores => ({
            name: skillScore.name,
            score: skillScore.score,
          })
        ),
      };

      return player;
    },
    [username]
  );
};

export default useProfile;
