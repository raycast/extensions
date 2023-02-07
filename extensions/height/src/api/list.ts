import { showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { CreateListFormValues, ListObject } from "../types/list";
import { ApiErrorResponse, UseFetchParams } from "../types/utils";
import { ApiHeaders, ApiUrls } from "./helpers";

type ApiListResponse = {
  list: ListObject[];
};

export const ApiList = {
  getAll(options?: UseFetchParams<ApiListResponse>) {
    return useFetch<ApiListResponse>(ApiUrls.lists, {
      headers: ApiHeaders,
      keepPreviousData: true,
      onError: (error) => {
        showToast({ title: "Error", message: error.message, style: Toast.Style.Failure });
      },
      ...options,
    });
  },
  async create(values: CreateListFormValues) {
    const response = await fetch(ApiUrls.lists, {
      method: "POST",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });

    if (response.ok) {
      return [(await response.json()) as ListObject, null] as const;
    } else {
      return [null, ((await response.json()) as ApiErrorResponse).error] as const;
    }
  },
};
