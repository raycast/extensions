import { useFetch } from "@raycast/utils";
import type { ListBrandIdentitiesResponse } from "../lib/notra";
import { getNotraRequestInit, NOTRA_API_URL } from "../lib/notra";
import type { BrandIdentity } from "../types";

export function useBrandIdentities() {
  return useFetch<ListBrandIdentitiesResponse, BrandIdentity[], BrandIdentity[]>(
    `${NOTRA_API_URL}/v1/brand-identities`,
    {
      ...getNotraRequestInit(),
      initialData: [],
      mapResult(result) {
        return {
          data: result.brandIdentities,
        };
      },
    },
  );
}
