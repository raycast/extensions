import { useFetch } from "@raycast/utils";
import { getNotraRequestInit, NOTRA_API_URL } from "../lib/notra";
import type { ListIntegrationsResponse } from "../types";

export function useIntegrations() {
  return useFetch<ListIntegrationsResponse, ListIntegrationsResponse, ListIntegrationsResponse>(
    `${NOTRA_API_URL}/v1/integrations`,
    {
      ...getNotraRequestInit(),
      initialData: {
        github: [],
        slack: [],
        linear: [],
        organization: { id: "", name: "", slug: "", logo: null },
      },
      mapResult(result) {
        return { data: result };
      },
    },
  );
}
