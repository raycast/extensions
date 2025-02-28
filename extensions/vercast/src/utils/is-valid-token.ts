import { getPreferenceValues } from "@raycast/api";
import { fetchUser } from "../vercel";

const isValidToken = async () => {
  const token = getPreferenceValues<Preferences>().accessToken;
  if (token.length !== 24) throw new Error("Invalid token length. Expected 24 characters.");
  const user = await fetchUser();
  if (!user) throw new Error("Failed to fetch user data. Token may be invalid.");
  return true;
};

export default isValidToken;
