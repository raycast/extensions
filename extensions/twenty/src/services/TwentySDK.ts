/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPreferenceValues } from "@raycast/api";
import { Api } from "../enum/api";
import fetch, { Response } from "node-fetch";
import { z } from "zod";
import { DataModelItem, extractDataModels, getActiveDataModelsSchema } from "./zod/schema/dataModelSchema";
import { extractDataModelWithFields, getDataModelWithFieldsSchema } from "./zod/schema/recordFieldSchema";
import { removeTrailingSlash } from "../helper/removeTrailingSlash";
import { isUrl } from "../helper/isUrl";

// `QUERY_MAX_RECORDS` on the Twenty API — larger values are clamped server side.
const METADATA_PAGE_SIZE = 200;
// Safety net so a server that never clears `hasNextPage` cannot loop forever.
const MAX_METADATA_PAGES = 25;

function describeError(err: unknown) {
  if (err instanceof z.ZodError) {
    const [issue] = err.issues;
    const path = issue?.path.join(".") || "response";
    return `Unexpected response from the Twenty API at "${path}": ${issue?.message ?? "invalid data"}`;
  }

  return err instanceof Error ? err.message : String(err);
}

class TwentySDK {
  private url!: string;
  private token!: string;

  constructor() {
    const { token, url: providedUrl } = getPreferenceValues<Preferences>();
    const url = removeTrailingSlash(providedUrl);
    this.token = `Bearer ${token}`;
    this.url = isUrl(url) ? `${url}/rest` : `https://api.twenty.com/rest`;
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      [Api.KEY]: this.token,
    };
  }

  private async describeResponseError(response: Response) {
    const body = await response.text().catch(() => "");

    try {
      const parsed = JSON.parse(body);
      const detail = parsed?.messages ?? parsed?.message ?? parsed?.error;

      if (Array.isArray(detail) && detail.length > 0) return detail.join(", ");
      if (typeof detail === "string" && detail.length > 0) return detail;
    } catch {
      // Body was not JSON, fall through to the status text.
    }

    return response.statusText || `Request failed with status ${response.status}`;
  }

  async getActiveDataModels() {
    try {
      const dataModels: DataModelItem[] = [];
      let startingAfter: string | undefined;

      for (let page = 0; page < MAX_METADATA_PAGES; page++) {
        const query = new URLSearchParams({ limit: String(METADATA_PAGE_SIZE) });
        if (startingAfter) query.set("starting_after", startingAfter);

        const response = await fetch(`${this.url}/metadata/objects?${query.toString()}`, {
          method: "GET",
          headers: this.headers,
        });

        if (!response.ok) {
          return await this.describeResponseError(response);
        }

        const parsed = getActiveDataModelsSchema.parse(await response.json());
        dataModels.push(...extractDataModels(parsed));

        const { pageInfo } = parsed;
        if (!pageInfo?.hasNextPage || !pageInfo.endCursor) break;
        startingAfter = pageInfo.endCursor;
      }

      // `isSystem` / `isActive` are optional on newer servers, so only exclude
      // models that explicitly opt out.
      return dataModels.filter((model) => model.isSystem !== true && model.isActive !== false);
    } catch (err) {
      return describeError(err);
    }
  }

  async getRecordFieldsForDataModel(id: string) {
    try {
      const response = await fetch(this.url + `/metadata/objects/${id}`, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        return await this.describeResponseError(response);
      }

      const objectRecordMetadata = extractDataModelWithFields(
        getDataModelWithFieldsSchema.parse(await response.json()),
      );
      const excludeFieldsWithName = ["updatedAt", "deletedAt"];

      return {
        ...objectRecordMetadata,
        fields: objectRecordMetadata.fields
          .filter((field) => field.isSystem !== true)
          .filter((field) => field.isActive !== false)
          .filter((field) => field.type !== "RELATION" && field.type !== "ACTOR") // handle relation later
          .filter((field) => !excludeFieldsWithName.includes(field.name)),
      };
    } catch (err) {
      return describeError(err);
    }
  }

  async createObjectRecord(namePlural: string, bodyParam: any) {
    try {
      const response = await fetch(this.url + `/${namePlural}`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          ...bodyParam,
        }),
      });

      if (response.ok) {
        return true;
      }

      return false;
    } catch (err) {
      throw new Error(err as string);
    }
  }
}

const twenty = new TwentySDK();
export default twenty;
