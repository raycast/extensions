import { Detail, List } from "@raycast/api";
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

  while (isLoading) {
    return <Detail isLoading={isLoading} markdown={"Loading Upcoming Launches 🚀"} />;
  }

  return (
    <List isShowingDetail>
      {data.results.map((launch) => (
        <LaunchDetail launch={launch} key={launch.id} />
      ))}
    </List>
  );
}
