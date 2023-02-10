import { useFetch } from "@raycast/utils";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { UserObject } from "../types/user";
import { ApiResponse } from "../types/utils";

export default function useUsers() {
  const { data, error, isLoading, mutate } = useFetch<ApiResponse<UserObject>>(ApiUrls.users, {
    headers: ApiHeaders,
  });

  return {
    usersData: data?.list,
    usersError: error,
    usersIsLoading: isLoading,
    usersMutate: mutate,
  };
}
