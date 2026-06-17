import { fetchUser } from "../vercel";

const isValidToken = async () => {
  const user = await fetchUser();
  if (!user) throw new Error("Failed to fetch user data. Token may be invalid.");
  return true;
};

export default isValidToken;
