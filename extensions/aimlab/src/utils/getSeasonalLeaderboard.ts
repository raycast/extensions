import { APIFetch, GET_SEASONAL_COMBINED_LEADERBOARD } from "./queries.js";

type PropTypes = {
  seasonId: string;
  taskId: string;
  weaponId: string;
  modeId: number;
};

const getSeasonalLeaderboard = async ({ seasonId, taskId, weaponId, modeId }: PropTypes) => {
  const res = await APIFetch(GET_SEASONAL_COMBINED_LEADERBOARD, {
    leaderboardInput: {
      clientId: "aimlab",
      taskId: taskId,
      taskMode: modeId,
      combined: true,
      seasonId: seasonId,
      weaponId: weaponId,
      offset: 0,
      limit: 100,
    },
  });

  return res.aimlab.leaderboard;
};

export default getSeasonalLeaderboard;
