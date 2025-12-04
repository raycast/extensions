import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { userAgent } from "./consts";

const preferences = getPreferenceValues<Preferences>();

export function rabbitData(route: string) {
  const bodyContent = {
    accessToken: preferences.accessToken,
  };

  const { isLoading, data, revalidate } = useFetch(`https://hole.rabbit.tech/apis/${route}`, {
    method: "POST",
    body: JSON.stringify(bodyContent),
    headers: {
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
      "User-Agent": userAgent,
    },
  });

  return { isLoading, data, revalidate };
}
