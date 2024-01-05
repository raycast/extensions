import { useFetch } from "@raycast/utils";

import { GetUser } from "../types/get_user.types"; // Types
import { useOAuth } from "./useOAuth";

export function GetCurrentUser() {
  const tokenSet = useOAuth();

  const { data, error } = useFetch<GetUser>(`https://secure.splitwise.com/api/v3.0/get_current_user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenSet?.accessToken}`,
    },
    keepPreviousData: true,
    execute: !!tokenSet,
  });

  const currentUser = data?.user;

  if (error) {
    console.log(`Error while fetching currrent user: \n ${error}`);
  }
  return currentUser;
}
