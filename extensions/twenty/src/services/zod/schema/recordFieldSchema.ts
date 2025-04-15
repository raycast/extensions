import { z } from "zod";

export const getDataModelWithFieldsSchema = z.object({
  data: z.object({
    object: z.object({
      id: z.string(),
      dataSourceId: z.string(),
      nameSingular: z.string(),
      namePlural: z.string(),
      labelSingular: z.string(),
      labelPlural: z.string(),
      description: z.string().nullable(),
      isCustom: z.boolean(),
      isActive: z.boolean(),
      isSystem: z.boolean(),
      fields: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
          label: z.string(),
          description: z.string().nullable(),
          isCustom: z.boolean(),
          isActive: z.boolean(),
          isSystem: z.boolean(),
          isNullable: z.boolean(),
          defaultValue: z.any().nullable(),
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
        }),
      ),
    }),
  }),
});

export type DataModelWithFields = z.infer<typeof getDataModelWithFieldsSchema>["data"]["object"];

export type DataModelField = DataModelWithFields["fields"][number];
export type ObjectRecordFields = {
  primary: DataModelField;
  rest: DataModelWithFields["fields"];
};
