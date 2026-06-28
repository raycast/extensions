import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiResponse, Collection, Tag } from "./interfaces";

const { LinkwardenUrl, LinkwardenApiKey } = getPreferenceValues<Preferences>();
export const baseUrl = `${LinkwardenUrl.replace(/\/+$/, "")}/api/v1/`;
export const headers = {
  Authorization: `Bearer ${LinkwardenApiKey}`,
};

export const useTags = () =>
  useFetch(baseUrl + "tags", {
    headers,
    mapResult(result: ApiResponse<Tag[]>) {
      return {
        // Fall back to [] if the API returns an unexpected body shape so that
        // consumers can always safely call `.map` on `data`.
        data: Array.isArray(result?.response) ? result.response : [],
      };
    },
    initialData: [] as Tag[],
    keepPreviousData: true,
  });

export const useCollections = () =>
  useFetch(baseUrl + "collections", {
    headers,
    mapResult(result: ApiResponse<Collection[]>) {
      return {
        // Fall back to [] if the API returns an unexpected body shape so that
        // consumers can always safely call `.map` on `data`.
        data: Array.isArray(result?.response) ? result.response : [],
      };
    },
    initialData: [] as Collection[],
    keepPreviousData: true,
  });
