import fetch from "node-fetch";
import { getOAuthToken } from "../components/withHeightAuth";
import { CreateListPayload, ListObject, UpdateListPayload } from "../types/list";
import { ApiErrorResponse } from "../types/utils";
import { ApiUrls } from "./helpers";

export const ApiList = {
  async create(values: CreateListPayload) {
    const response = await fetch(ApiUrls.lists, {
      method: "POST",
      headers: {
        Authorization: `api-key ${getOAuthToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      return [(await response.json()) as ListObject, null] as const;
    } else {
      return [null, ((await response.json()) as ApiErrorResponse).error] as const;
    }
  },
  update(listId: string, values: UpdateListPayload) {
    return fetch(`${ApiUrls.lists}/${listId}`, {
      method: "PATCH",
      headers: {
        Authorization: `api-key ${getOAuthToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });
  },
};
