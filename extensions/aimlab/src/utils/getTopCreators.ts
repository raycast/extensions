import { APIFetch, GET_TOP_CREATORS } from "./queries.js";

const getTopCreators = async () => {
  const res = await APIFetch(GET_TOP_CREATORS, {
    limit: 10,
    offset: 0,
  });

  return res.authors;
};

export default getTopCreators;
