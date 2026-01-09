import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ShodanHost } from "../api/types";

interface UseShodanHostOptions {
  ip: string;
  enabled?: boolean;
}

export function useShodanHost({ ip, enabled = true }: UseShodanHostOptions) {
  const { apiKey } = getPreferenceValues<Preferences>();

  const { data, isLoading, error, revalidate } = useFetch<ShodanHost>(
    `https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`,
    {
      execute: enabled && ip.length > 0,
      keepPreviousData: true,
      onError: (err) => {
        let message = err.message;
        if (message.includes("401")) {
          message = "Invalid API key. Please check your extension preferences.";
        } else if (message.includes("404")) {
          message = "No information available for this IP address.";
        } else if (message.includes("429")) {
          message = "Rate limit exceeded. Please wait.";
        }

        showToast({
          style: Toast.Style.Failure,
          title: "Host Lookup Failed",
          message,
        });
      },
    },
  );

  return {
    host: data,
    isLoading,
    error,
    revalidate,
  };
}
