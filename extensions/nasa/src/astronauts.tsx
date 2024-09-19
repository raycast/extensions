import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./constants/prefrences";
import { AstronautsResponse } from "./types/astronauts";
import AstronautDetail from "./componenets/astronaut";

export default function ASTRONAUTS() {
  const { isLoading, data } = useFetch(ENDPOINTS.ASTRONAUTS, {
    headers: HEADERS,
    mapResult(result: AstronautsResponse) {
      return {
        data: result,
      };
    },
    initialData: [],
  });

  return (
    <List isShowingDetail isLoading={isLoading}>
      {data.results.map((astronaut) => (
        <AstronautDetail astronaut={astronaut} key={astronaut.id} />
      ))}
    </List>
  );
}
