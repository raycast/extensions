import { useFetch } from "@raycast/utils";
import getAccessToken from "./getAccessToken";

export function fetchGranolaData(route: string) {
  const url = `https://api.granola.ai/v2/${route}`;

  const accessToken = getAccessToken();

  const { isLoading, data, revalidate } = useFetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return { isLoading, data, revalidate };
}
