import { useCallback } from "react";
import { client } from "../client";
import { loginGoogle, logoutClient, refreshTokens } from "../utils";

export const useAuth = () => {
  const logout = useCallback(async () => {
    await logoutClient();
  }, [logoutClient]);

  const authorize = useCallback(async () => {
    const tokens = await client.getTokens();

    if (tokens?.accessToken) {
      if (tokens?.refreshToken && tokens.isExpired()) {
        const newTokens = await refreshTokens(tokens.refreshToken);
        await client.setTokens(newTokens);
      }
      return;
    }

    await loginGoogle();
  }, [loginGoogle]);

  return { logout, authorize };
};
