import { useCachedPromise } from "@raycast/utils";
import { getCurrentUser } from "../api/auth";
import { getMemosConnection } from "../helpers/preferences";

export const useCurrentUser = () => {
  const { data, error, isLoading } = useCachedPromise(() => getCurrentUser(getMemosConnection()), [], {
    onError: () => undefined,
  });
  return { user: data, error, isLoading };
};
