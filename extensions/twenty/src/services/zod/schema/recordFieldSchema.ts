import { z } from "zod";

export const dataModelFieldSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  label: z.string(),
  description: z.string().nullish(),
  // Dropped from the metadata API in Twenty 2.12, so it is absent on newer servers.
  isCustom: z.boolean().nullish(),
  isActive: z.boolean().nullish(),
  isSystem: z.boolean().nullish(),
  isNullable: z.boolean().nullish(),
  defaultValue: z.any().nullish(),
  options: z
    .array(
      z.object({
        id: z.string().nullish(),
        color: z.string().nullish(),
        label: z.string().nullish(),
        value: z.string().nullish(),
        position: z.number().nullish(),
      }),
    )
    .nonempty()
    .nullish(),
});

export const dataModelWithFieldsSchema = z.object({
  id: z.string(),
  dataSourceId: z.string().nullish(),
  nameSingular: z.string(),
  namePlural: z.string(),
  labelSingular: z.string(),
  labelPlural: z.string(),
  description: z.string().nullish(),
  isCustom: z.boolean().nullish(),
  isActive: z.boolean().nullish(),
  isSystem: z.boolean().nullish(),
  fields: z.array(dataModelFieldSchema),
});

// Older Twenty servers wrap the object as `{ data: { object: {...} } }`, newer
// ones return the object metadata directly.
export const getDataModelWithFieldsSchema = z.union([
  z.object({ data: z.object({ object: dataModelWithFieldsSchema }) }),
  dataModelWithFieldsSchema,
]);

export type DataModelWithFields = z.infer<typeof dataModelWithFieldsSchema>;

export type DataModelField = DataModelWithFields["fields"][number];
export type ObjectRecordFields = {
  primary: DataModelField;
  rest: DataModelWithFields["fields"];
};

export function extractDataModelWithFields(
  response: z.infer<typeof getDataModelWithFieldsSchema>,
): DataModelWithFields {
  return "data" in response ? response.data.object : response;
}
