import { useFetch } from "@raycast/utils";
import { USER_AGENT } from "@/constants";

export const useMirrorTest = (domain: string) => {
  const { error, isLoading, revalidate } = useFetch<boolean>(domain, {
    method: "OPTIONS",
    headers: {
      "User-Agent": USER_AGENT,
    },
    parseResponse: (response) => {
      if (!response.ok) {
        throw new Error("Mirror is not up");
      }
      return Promise.resolve(true);
    },
    onError: () => {},
  });

  const isUp = !error && !isLoading;

  return { isUp, isLoading, error: error ?? null, revalidate };
};
