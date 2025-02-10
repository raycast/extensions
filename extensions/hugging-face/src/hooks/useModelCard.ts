import { useFetch } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { EntityType } from "../interfaces";

export const useModelCard = (modelId: string, type: EntityType) => {
  const url = `https://huggingface.co/${
    type === EntityType.Dataset ? `datasets/${modelId}` : modelId
  }/raw/main/README.md`;
  const { data, isLoading, revalidate, error } = useFetch<string, string>(url, {
    parseResponse: async (response) => {
      if (response.status === 404) {
        throw new Error(`No README found for ${modelId}`);
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch README for ${modelId}`);
      }
      return await response.text();
    },
    initialData: "Loading README...",
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: `Could not load README for ${modelId}`,
        message: String(err),
      });
    },
  });

  return {
    isLoading,
    data,
    revalidate,
    error,
  };
};
