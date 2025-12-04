import { APIFetch, GET_TASK_LEADERBOARD } from "./queries.js";

type PropTypes = {
  taskId: string;
  weaponId: string;
};

const getTaskLeaderboard = async ({ taskId, weaponId }: PropTypes) => {
  const res = await APIFetch(GET_TASK_LEADERBOARD, {
    leaderboardInput: {
      clientId: "aimlab",
      taskId: taskId,
      taskMode: 0,
      weaponId: weaponId,
      offset: 0,
      limit: 100,
    },
  });

  return res.aimlab.leaderboard;
};

export default getTaskLeaderboard;
