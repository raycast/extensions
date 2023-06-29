import { useCachedPromise } from "@raycast/utils";
import getProfile from "../utils/getProfile";
import type { Player, SkillScores } from "../types/player.types";

const useProfile = (username: string) => {
  return useCachedPromise(
    async (username: string) => {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (skillScore: any): SkillScores => ({
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
