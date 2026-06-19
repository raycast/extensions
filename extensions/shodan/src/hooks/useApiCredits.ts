import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiInfo } from "../api/types";

export function useApiCredits() {
  const { apiKey } = getPreferenceValues<Preferences>();

  const { data, isLoading, error, revalidate } = useFetch<ApiInfo>(
    `https://api.shodan.io/api-info?key=${apiKey}`,
    {
      keepPreviousData: true,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch API credits",
          message: err.message,
        });
      },
    },
  );

  return {
    queryCredits: data?.query_credits ?? 0,
    scanCredits: data?.scan_credits ?? 0,
    monitoredIps: data?.monitored_ips ?? 0,
    plan: data?.plan ?? "unknown",
    isLoading,
    error,
    refresh: revalidate,
  };
}
