import { useCallback } from "react";
import { useAsync } from "react-async";
import { Me } from "../types/arena";
import { api } from "../util/api";
import { useToken } from "./useToken";

export const useProfile = () => {
  const accessToken = useToken();

  const promiseFn = useCallback(() => api(accessToken)<Me>("GET", "/me"), []);
  return useAsync<Me>(promiseFn);
};
