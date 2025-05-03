import fetch from "node-fetch";

import { ApiUrls } from "@/api/helpers";
import { getOAuthToken } from "@/components/withHeightAuth";
import { CreateListPayload, ListObject, UpdateListPayload } from "@/types/list";
import { ApiErrorResponse, ApiResponse } from "@/types/utils";

export async function getList() {
  const response = await fetch(ApiUrls.lists, {
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    return (await response.json()) as ApiResponse<ListObject[]>;
  } else {
    throw new Error(((await response.json()) as ApiErrorResponse).error.message);
  }
}

export async function createList(values: CreateListPayload) {
  const response = await fetch(ApiUrls.lists, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  if (response.ok) {
    return [(await response.json()) as ListObject, null] as const;
  } else {
    return [null, ((await response.json()) as ApiErrorResponse).error] as const;
  }
}

export function updateList(listId: string, values: UpdateListPayload) {
  return fetch(`${ApiUrls.lists}/${listId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });
}
