import { APIFetch, GET_USER_INFO } from "./queries.js";

const getProfile = async (username: string) => {
  const res = await APIFetch(GET_USER_INFO, {
    username: username,
  });

  return res.aimlabProfile;
};

export default getProfile;
