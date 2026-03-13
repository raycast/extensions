import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { LaunchesResponse } from "@/types";
import { ENDPOINTS, HEADERS } from "@/constants/preferences";
import ErrorDetail from "@/components/error";
import LaunchDetail from "@/components/launches";

export default function LAUNCHES() {
  const { isLoading, data, error } = useFetch(ENDPOINTS.LAUNCHES, {
    headers: HEADERS,
    mapResult(result: LaunchesResponse) {
      return {
        data: result,
      };
    },
    initialData: [],
  });

  return error ? (
    <ErrorDetail error={error} />
  ) : (
    <List isShowingDetail isLoading={isLoading}>
      {!isLoading && data.results.map((launch) => <LaunchDetail launch={launch} key={launch.id} />)}
    </List>
  );
}
