import type { DataModelField, DataModelWithFields } from "../services/zod/schema/recordFieldSchema";

const PRIMARY_FIELD_NAMES = ["name", "title"] as const;
const TEXT_LIKE_FIELD_TYPES = new Set(["FULL_NAME", "TEXT"]);

export const selectPrimaryField = (objectRecordMetadata: DataModelWithFields): DataModelField => {
  for (const fieldName of PRIMARY_FIELD_NAMES) {
    const field = objectRecordMetadata.fields.find((candidate) => candidate.name === fieldName);

    if (field) {
      return field;
    }
  }

  const textLikeField = objectRecordMetadata.fields.find((field) => TEXT_LIKE_FIELD_TYPES.has(field.type));

  if (textLikeField) {
    return textLikeField;
  }

  const firstField = objectRecordMetadata.fields[0];

  if (firstField) {
    return firstField;
  }

  throw new Error("Object metadata does not contain any active fields.");
};
