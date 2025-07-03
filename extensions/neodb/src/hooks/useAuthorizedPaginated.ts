import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PaginatedResult } from "../types";

const useAuthorizedPaginated = <T>(resource: string, { execute } = { execute: true }) => {
  const { token } = getPreferenceValues<Preferences.Account>();

  const { isLoading, data } = useFetch(`https://neodb.social/api/me/${resource}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    mapResult(result: PaginatedResult<T>) {
      return {
        data: result.data,
      };
    },
    initialData: [],
    execute,
  });

  return {
    isLoading,
    data,
  };
};

export default useAuthorizedPaginated;
