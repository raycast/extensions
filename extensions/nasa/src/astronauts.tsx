import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { AstronautsResponse } from "@/types";
import { ENDPOINTS, HEADERS } from "@/constants/preferences";
import AstronautDetail from "@/components/astronaut";
import ErrorDetail from "@/components/error";

export default function ASTRONAUTS() {
  const { isLoading, data, error } = useFetch(ENDPOINTS.ASTRONAUTS, {
    headers: HEADERS,
    mapResult(result: AstronautsResponse) {
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
      {!isLoading && data.results.map((astronaut) => <AstronautDetail astronaut={astronaut} key={astronaut.id} />)}
    </List>
  );
}
