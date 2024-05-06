import { useCallback } from "react";
import { logoutClient } from "../lib/auth";

export const useAuth = () => {
  const logout = useCallback(async () => {
    await logoutClient();
  }, [logoutClient]);

  return { logout };
};
