import { getAccessToken } from "@raycast/utils";
import { Arena } from "../api/arena";
import { useMemo } from "react";

export function useArena() {
  const { token } = getAccessToken();

  return useMemo(() => {
    return new Arena({
      accessToken: token,
    });
  }, [token]);
}
