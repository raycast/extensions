import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { SpaceCraftsResponse } from "@/types";
import { ENDPOINTS, HEADERS } from "@/constants/preferences";
import ErrorDetail from "@/components/error";
import SpacecraftDetail from "@/components/spacecraft";

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
