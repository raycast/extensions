import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./constants/prefrences";
import { SpaceCraftsResponse } from "./types/spacecrafts";
import SpacecraftDetail from "./componenets/spacecraft";

export default function SPACECRAFTS() {
  const { isLoading, data } = useFetch(ENDPOINTS.SPACECRAFTS, {
    headers: HEADERS,
    mapResult(result: SpaceCraftsResponse) {
      return {
        data: result,
      };
    },
    initialData: [],
  });

  return (
    <List isShowingDetail isLoading={isLoading}>
      {!isLoading && data.results.map((spacecraft) => <SpacecraftDetail spacecraft={spacecraft} key={spacecraft.id} />)}
    </List>
  );
}
