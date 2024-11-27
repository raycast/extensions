import { APIFetch, GET_USER_PLAYS_AGG } from "./queries.js";

const getPlaysAgg = async (id: string) => {
  const res = await APIFetch(GET_USER_PLAYS_AGG, {
    where: {
      is_practice: {
        _eq: false,
      },
      score: {
        _gt: 0,
      },
      user_id: {
        _eq: id,
      },
    },
  });

  return res.aimlab.plays_agg;
};

export default getPlaysAgg;
