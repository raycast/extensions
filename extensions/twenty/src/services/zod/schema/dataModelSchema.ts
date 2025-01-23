import { z } from "zod";

export const dataModelSchema = z.array(
  z.object({
    id: z.string(),
    dataSourceId: z.string(),
    nameSingular: z.string(),
    namePlural: z.string(),
    labelSingular: z.string(),
    labelPlural: z.string(),
    description: z.string().nullable(),
    icon: z.string().nullable(),
    isCustom: z.boolean(),
    isActive: z.boolean(),
    isSystem: z.boolean(),
  }),
);

export const getActiveDataModelsSchema = z.object({
  data: z.object({
    objects: dataModelSchema,
  }),
});

export type DataModel = z.infer<typeof dataModelSchema>;
