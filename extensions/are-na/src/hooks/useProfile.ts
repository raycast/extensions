import { useCallback } from "react";
import { useAsync } from "react-async";
import { User } from "../types/arena";
import { api } from "../util/api";
import { useToken } from "./useToken";

export const useProfile = () => {
  const accessToken = useToken();

  const promiseFn = useCallback(() => api(accessToken)<User>("GET", "/me"), []);
  return useAsync<User>(promiseFn);
};
