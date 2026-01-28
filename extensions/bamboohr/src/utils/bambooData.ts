import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();

export function bamboo(route: string) {
  const { isLoading, data, revalidate } = useFetch(
    `https://api.bamboohr.com/api/gateway.php/${preferences.bamboo_subdomain}/v1/${route}`,
    {
      headers: {
        accept: "application/json",
        Authorization: `Basic ${btoa(`${preferences.bamboo_api_key}:x`)}`,
      },
    },
  );

  return { isLoading, data, revalidate };
}
