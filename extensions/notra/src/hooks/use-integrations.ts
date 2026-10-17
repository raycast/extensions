import { useFetch } from "@raycast/utils";
import { getNotraRequestInit, NOTRA_API_URL } from "../lib/notra";
import type { ListIntegrationsResponse, WorkspaceScopedOptions } from "../types";

export function useIntegrations({ execute, organizationId }: WorkspaceScopedOptions = {}) {
  return useFetch<ListIntegrationsResponse, ListIntegrationsResponse, ListIntegrationsResponse>(
    `${NOTRA_API_URL}/v1/integrations`,
    {
      ...getNotraRequestInit({ organizationId }),
      execute,
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
