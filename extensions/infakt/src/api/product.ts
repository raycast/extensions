import fetch from "node-fetch";

import { ApiBaseUrl, ApiHeaders, ApiUrls } from "@/api/helpers";
import { CreateProductPayload, ProductObject, UpdateProductPayload } from "@/types/product";
import { ApiErrorResponse } from "@/types/utils";

export const ApiProduct = {
  async create(values: CreateProductPayload) {
    const response = await fetch(ApiUrls.products, {
      method: "POST",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });

    if (response.ok) {
      return [(await response.json()) as ProductObject, null] as const;
    } else {
      return [null, ((await response.json()) as ApiErrorResponse).error] as const;
    }
  },
  update(productId: number, values: UpdateProductPayload) {
    return fetch(`${ApiBaseUrl}/products/${productId}.json`, {
      method: "PUT",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });
  },
  delete(productId: number) {
    return fetch(`${ApiBaseUrl}/products/${productId}.json`, {
      method: "DELETE",
      headers: ApiHeaders,
    });
  },
};
