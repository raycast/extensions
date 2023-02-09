import fetch from "node-fetch";
import { CreateListPayload, ListObject, UpdateListPayload } from "../types/list";
import { ApiErrorResponse } from "../types/utils";
import { ApiHeaders, ApiUrls } from "./helpers";

export const ApiList = {
  async create(values: CreateListPayload) {
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
  update(id: string, values: UpdateListPayload) {
    return fetch(`${ApiUrls.lists}/${id}`, {
      method: "PATCH",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });
  },
};
