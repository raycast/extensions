import { useMemo, useState, useCallback, useEffect } from "react";
import { useAsync } from "react-async";
import { User } from "../types/arena";
import { api } from "../util/api";

export const useProfile = (accessToken: string) => {
  const fetch = useMemo(() => async (): Promise<User> => api(accessToken)("GET", "/me"), [accessToken]);
  return useAsync<User>(fetch);
};
