import { useFetch } from "@raycast/utils";
import { GET_USER } from "../api";
import useToken from "./useToken";
import { UserData } from "../schema";

export const useUser = () => {
  const token = useToken();

  const getUserInfo = () => {
    return useFetch<UserData>(GET_USER, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  };

  return { getUserInfo };
};

export default useUser;
