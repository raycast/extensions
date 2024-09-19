import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./constants/prefrences";
import { LaunchesResponse } from "./types/launches";
import LaunchDetail from "./componenets/launches";

export default function LAUNCHES() {
  const { isLoading, data } = useFetch(ENDPOINTS.LAUNCHES, {
    headers: HEADERS,
    mapResult(result: LaunchesResponse) {
      return {
        data: result,
      };
    },
    initialData: [],
  });

  return (
    <List isShowingDetail isLoading={isLoading}>
      {data.results.map((launch) => (
        <LaunchDetail launch={launch} key={launch.id} />
      ))}
    </List>
  );
}
