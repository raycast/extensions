import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./constants/prefrences";
import { SpaceCraftsResponse } from "./types/spacecrafts";
import SpacecraftDetail from "./componenets/spacecraft";
import ErrorDetail from "./componenets/error";

export default function SPACECRAFTS() {
  const { isLoading, data, error } = useFetch(ENDPOINTS.SPACECRAFTS, {
    headers: HEADERS,
    mapResult(result: SpaceCraftsResponse) {
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
      {!isLoading && data.results.map((spacecraft) => <SpacecraftDetail spacecraft={spacecraft} key={spacecraft.id} />)}
    </List>
  );
}
