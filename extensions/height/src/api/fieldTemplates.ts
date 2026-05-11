import fetch from "node-fetch";

import { ApiUrls } from "@/api/helpers";
import { getOAuthToken } from "@/components/withHeightAuth";
import { FieldTemplateObject } from "@/types/fieldTemplate";
import { ApiErrorResponse, ApiResponse } from "@/types/utils";

export async function getFieldTemplates() {
  const response = await fetch(ApiUrls.fieldTemplates, {
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    return (await response.json()) as ApiResponse<FieldTemplateObject[]>;
  } else {
    throw new Error(((await response.json()) as ApiErrorResponse).error.message);
  }
}
