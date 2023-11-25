import { useFetch } from "@raycast/utils";
import { API_URL } from "../config";

export const useVersions = () => {
  const { data, isLoading } = useFetch<{ versions: string[] }>(`${API_URL}/versions`, {
    method: "GET",
  });

  return {
    versions: data?.versions,
    isLoading,
  };
};
