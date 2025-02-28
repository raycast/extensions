import { getPreferenceValues } from "@raycast/api";
import { fetchUser } from "../vercel";

const isValidToken = async () => {
  const token = getPreferenceValues<Preferences>().accessToken;
  if (token.length !== 24) throw new Error();
  const user = await fetchUser();
  if (!user) throw new Error();
  return true;
};

export default isValidToken;
