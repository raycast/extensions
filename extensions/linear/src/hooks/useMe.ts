import { getLinearClient } from "../api/linearClient";
import { useCachedPromise } from "@raycast/utils";

export default function useMe() {
  const { linearClient } = getLinearClient();
  const { data, error, isLoading } = useCachedPromise(() => linearClient.viewer);

  return { me: data, meError: error, isLoadingMe: (!data && !error) || isLoading };
}
