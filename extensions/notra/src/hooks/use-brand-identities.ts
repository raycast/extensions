import { useFetch } from "@raycast/utils";
import { getNotraRequestInit, NOTRA_API_URL } from "../lib/notra";
import type { BrandIdentity, ListBrandIdentitiesResponse, WorkspaceScopedOptions } from "../types";

export function useBrandIdentities({ execute, organizationId }: WorkspaceScopedOptions = {}) {
  return useFetch<ListBrandIdentitiesResponse, BrandIdentity[], BrandIdentity[]>(
    `${NOTRA_API_URL}/v1/brand-identities`,
    {
      ...getNotraRequestInit({ organizationId }),
      execute,
      initialData: [],
      mapResult(result) {
        return {
          data: result.brandIdentities,
        };
      },
    },
  );
}
