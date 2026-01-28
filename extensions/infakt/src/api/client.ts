import fetch from "node-fetch";

import { ApiBaseUrl, ApiHeaders, ApiUrls } from "@/api/helpers";
import { ClientObject, CreateClientPayload, UpdateClientPayload } from "@/types/client";
import { ApiErrorResponse } from "@/types/utils";

export const ApiClient = {
  async create(values: CreateClientPayload) {
    const response = await fetch(ApiUrls.clients, {
      method: "POST",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });

    if (response.ok) {
      return [(await response.json()) as ClientObject, null] as const;
    } else {
      return [null, ((await response.json()) as ApiErrorResponse).error] as const;
    }
  },
  update(clientId: number, values: UpdateClientPayload) {
    return fetch(`${ApiBaseUrl}/clients/${clientId}.json`, {
      method: "PUT",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });
  },
  delete(clientId: number) {
    return fetch(`${ApiBaseUrl}/clients/${clientId}.json`, {
      method: "DELETE",
      headers: ApiHeaders,
    });
  },
};
