import { useCachedPromise } from "@raycast/utils";

import { getAuthenticatedUri } from "../api/request";

export default function useAuthenticatedUri(uri: string, contentType: string) {
  const { data: dataUri, isLoading } = useCachedPromise(getAuthenticatedUri, [uri, contentType]);
  return { dataUri, isLoading };
}
