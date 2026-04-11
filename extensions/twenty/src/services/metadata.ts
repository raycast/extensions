import { getActiveDataModelsSchema } from "./zod/schema/dataModelSchema";
import { getDataModelWithFieldsSchema } from "./zod/schema/recordFieldSchema";
import type { TwentyClient } from "./client";

const EXCLUDED_FIELD_NAMES = new Set(["updatedAt", "deletedAt"]);
const UNSUPPORTED_CREATE_FIELD_TYPES = new Set(["RELATION", "ACTOR"]);

export const createMetadataService = (client: TwentyClient) => ({
  async getActiveDataModels() {
    const rawData: unknown = await client.requestJson("/metadata/objects");

    if (rawData === undefined) {
      throw new Error("Twenty metadata request returned no data.");
    }

    const parsed = getActiveDataModelsSchema.parse(rawData);

    return parsed.data.objects.filter((model) => model.isActive && !model.isSystem);
  },

  async getRecordFieldsForDataModel(id: string) {
    const rawData: unknown = await client.requestJson(`/metadata/objects/${id}`);

    if (rawData === undefined) {
      throw new Error("Twenty metadata request returned no data.");
    }

    const parsed = getDataModelWithFieldsSchema.parse(rawData);
    const object = parsed.data.object;

    return {
      ...object,
      fields: object.fields.filter(
        (field) =>
          field.isActive &&
          !field.isSystem &&
          !EXCLUDED_FIELD_NAMES.has(field.name) &&
          !UNSUPPORTED_CREATE_FIELD_TYPES.has(field.type),
      ),
    };
  },
});
