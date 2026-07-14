import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchSubscriptions } from "../utils/graphql";

export function useSubscriptions() {
  const {
    data: subscriptions = [],
    isLoading,
    error,
  } = useCachedPromise(fetchSubscriptions, [], {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load subscriptions",
        message: err.message,
      });
    },
  });

  return { subscriptions, isLoading, error };
}
