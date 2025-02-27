import { showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { LDFlag } from "../types";
import { getLDBaseUrl, getLDPreferences } from "../utils/ld-urls";

export function useLDFlagDetail(flagKey: string) {
  const { apiToken, projectKey } = getLDPreferences();

  const query = new URLSearchParams();
  query.set("expand", "environments,variations,rules,fallthrough,targets,prerequisites");

  const baseUrl = getLDBaseUrl();
  const { data, isLoading, error, revalidate } = useFetch<LDFlag>(
    `${baseUrl}/api/v2/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}?${query.toString()}`,
    {
      headers: {
        Authorization: apiToken,
        "ld-api-version": "20240415",
      },
      parseResponse: async (response) => {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status} – ${text}`);
        }
        return (await response.json()) as LDFlag;
      },
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Error fetching Flag Detail",
          message: err.message,
          primaryAction: {
            title: "Retry",
            onAction: () => revalidate(),
          },
        });
      },
      execute: Boolean(apiToken && projectKey),
    },
  );

  return { data, isLoading, error, revalidate };
}
