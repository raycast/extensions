import { Detail, List } from "@raycast/api";
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

  while (isLoading) {
    return <Detail isLoading={isLoading} markdown={"Loading Astronauts in Space 🚀"} />;
  }

  return (
    <List isShowingDetail>
      {data.results.map((astronaut) => (
        <AstronautDetail astronaut={astronaut} key={astronaut.id} />
      ))}
    </List>
  );
}
