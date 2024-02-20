import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();

export function oura(route: string) {
  const { isLoading, data, revalidate, error } = useFetch(`https://api.ouraring.com/v2/${route}`, {
    headers: {
      Authorization: `Bearer ${preferences.oura_token}`,
    },
  });

  return { isLoading, data, revalidate, error };
}
