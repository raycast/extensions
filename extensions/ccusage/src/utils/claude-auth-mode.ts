import { getClaudeAccessToken } from "./keychain-access";

export const hasClaudeOAuthToken = async (): Promise<boolean> => {
  const accessToken = await getClaudeAccessToken();
  return typeof accessToken === "string" && accessToken.trim().length > 0;
};
