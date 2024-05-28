import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();

export function sbData(route: string) {
  // console.log(`${preferences.apiLocation}/v1/${route}`);
  const { isLoading, data, revalidate } = useFetch(`${preferences.apiLocation}/v1/${route}?per_page=100`, {
    headers: {
      Authorization: preferences.accessToken,
    },
  });

  return { isLoading, data, revalidate };
}
