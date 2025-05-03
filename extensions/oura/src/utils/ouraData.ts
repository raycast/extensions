import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Preference } from "../types";

const preferences = getPreferenceValues<Preference>();

export function oura(route: string) {
  const { isLoading, data, revalidate, error } = useFetch(`https://api.ouraring.com/v2/${route}`, {
    headers: {
      Authorization: `Bearer ${preferences.oura_token}`,
    },
  });

  return { isLoading, data, revalidate, error };
}
