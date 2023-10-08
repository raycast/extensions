import fetch from "node-fetch";
import { getOAuthToken } from "../components/withHeightAuth";
import { FieldTemplateObject } from "../types/fieldTemplate";
import { ApiErrorResponse, ApiResponse } from "../types/utils";
import { ApiUrls } from "./helpers";

export const ApiFieldTemplates = {
  async get() {
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
  },
};
