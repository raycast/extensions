import { APIFetch, GET_TASK_LEADERBOARD } from "./queries.js";

const getLeaderboard = async () => {
  const res = await APIFetch(GET_TASK_LEADERBOARD, {});

  return res.aimlab.plays_agg;
};

export default getLeaderboard;
