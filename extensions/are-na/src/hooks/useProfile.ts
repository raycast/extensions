import { User } from "../types/arena";
import { api } from "../util/api";
import { useQuery } from "react-query";
import { useToken } from "./useToken";

export const useProfile = () => {
  const accessToken = useToken();
  const url = "/me";
  return useQuery<User>(url, (): Promise<User> => api(accessToken)("GET", url));
};
