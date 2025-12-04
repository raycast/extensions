import { useFetch } from "@raycast/utils";

export const useIfUrlExists = (url: string | null) => {
  const { data, isLoading, error } = useFetch(url ?? "null", {
    method: "HEAD",
    parseResponse: async (response) => {
      return response.ok;
    },
    initialData: false,
    keepPreviousData: true,
    execute: url !== null,
  });

  const exists = url !== null && data && !error;

  return { exists, isLoading, error };
};
