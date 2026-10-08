import { useFetch } from "@raycast/utils";

import { GetUser } from "../types/get_user.types"; // Types
import { HEADER } from "./userPreferences";

export function GetCurrentUser() {
  const { data, error } = useFetch<GetUser>(`https://secure.splitwise.com/api/v3.0/get_current_user`, {
    method: "GET",
    ...HEADER,
    keepPreviousData: true,
  });

  const currentUser = data?.user;

  if (error) {
    console.log(`Error while fetching currrent user: \n ${error}`);
  }
  return currentUser;
}
