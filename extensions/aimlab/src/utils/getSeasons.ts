import { APIFetch, GET_SEASONS } from "./queries.js";

const getSeasons = async (activeOnly: boolean) => {
  const res = await APIFetch(GET_SEASONS, {
    activeOnly: activeOnly,
  });

  return res.seasons;
};

export default getSeasons;
