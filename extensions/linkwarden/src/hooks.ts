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
        data: result.response,
      };
    },
    initialData: [],
    keepPreviousData: true,
  });

export const useCollections = () =>
  useFetch(baseUrl + "collections", {
    headers,
    mapResult(result: ApiResponse<Collection[]>) {
      return {
        data: result.response,
      };
    },
    initialData: [],
    keepPreviousData: true,
  });
