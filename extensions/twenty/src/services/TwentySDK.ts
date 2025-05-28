/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPreferenceValues } from "@raycast/api";
import { Api } from "../enum/api";
import fetch from "node-fetch";
import { getActiveDataModelsSchema } from "./zod/schema/dataModelSchema";
import { getDataModelWithFieldsSchema } from "./zod/schema/recordFieldSchema";
import { removeTrailingSlash } from "../helper/removeTrailingSlash";
import { isUrl } from "../helper/isUrl";

class TwentySDK {
  private url!: string;
  private token!: string;

  constructor() {
    const { token, url: providedUrl } = getPreferenceValues<Preferences>();
    const url = removeTrailingSlash(providedUrl);
    this.token = `Bearer ${token}`;
    this.url = isUrl(url) ? `${url}/rest` : `https://api.twenty.com/rest`;
  }

  async getActiveDataModels() {
    try {
      const response = await fetch(this.url + "/metadata/objects", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          [Api.KEY]: this.token,
        },
      });

      if (response.ok) {
        const rawData = await response.json();
        const data = getActiveDataModelsSchema.parse(rawData);
        const activeDataModel = data.data.objects.filter((model) => !model.isSystem && model.isActive);
        return activeDataModel;
      }

      return response.statusText;
    } catch (err) {
      return err as string;
    }
  }

  async getRecordFieldsForDataModel(id: string) {
    try {
      const response = await fetch(this.url + `/metadata/objects/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          [Api.KEY]: this.token,
        },
      });

      if (response.ok) {
        const rawData = await response.json();
        const objectRecordWithFieldsMetadata = getDataModelWithFieldsSchema.parse(rawData);
        const excludeFieldsWithName = ["updatedAt", "deletedAt"];
        objectRecordWithFieldsMetadata.data.object.fields = objectRecordWithFieldsMetadata.data.object.fields
          .filter((object) => !object.isSystem)
          .filter((object) => object.isActive)
          .filter((object) => object.type !== "RELATION" && object.type !== "ACTOR") // handle relation later
          .filter((object) => !excludeFieldsWithName.includes(object.name));

        return objectRecordWithFieldsMetadata.data.object;
      }

      return response.statusText;
    } catch (err) {
      return err as string;
    }
  }

  async createObjectRecord(namePlural: string, bodyParam: any) {
    try {
      const response = await fetch(this.url + `/${namePlural}`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          [Api.KEY]: this.token,
        },
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
