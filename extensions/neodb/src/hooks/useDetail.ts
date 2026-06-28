import { useFetch } from "@raycast/utils";
import { Category, ItemType } from "../types";

const useDetail = (category: Category, uuid: string) => {
  let endpoint: string;

  switch (category) {
    case "music":
      endpoint = "album";
      break;
    case "tv":
      endpoint = "tv/season";
      break;
    default:
      endpoint = category;
  }

  const { isLoading, data, error } = useFetch<ItemType>(`https://neodb.social/api/${endpoint}/${uuid}`, {
    keepPreviousData: true,
  });

  return {
    isLoading,
    data,
    error,
  };
};

export default useDetail;
