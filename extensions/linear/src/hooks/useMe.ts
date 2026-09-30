import { useCachedPromise } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";

export default function useMe() {
  const { linearClient } = getLinearClient();
  const { data, error, isLoading } = useCachedPromise(() => linearClient.viewer);

  return { me: data, meError: error, isLoadingMe: (!data && !error) || isLoading };
}
