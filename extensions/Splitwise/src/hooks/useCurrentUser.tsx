import { useFetch } from "@raycast/utils";
import { Cache } from "@raycast/api";

import { GetUser } from "../types/get_user.types"; // Types
import { HEADER } from "./userPreferences";

// const cached = new Cache();

export function GetCurrentUser() {
  const { data, error } = useFetch<GetUser>(`https://secure.splitwise.com/api/v3.0/get_current_user`, {
    method: "GET",
    ...HEADER,
    keepPreviousData: true,
  });

  const currentUser = data?.user;
  // cached.set("currentUser",  JSON.stringify(currentUser));

  if (error) {
    console.log(`Error while fetching currrent user: \n ${error}`);
  }
  return currentUser;
}
