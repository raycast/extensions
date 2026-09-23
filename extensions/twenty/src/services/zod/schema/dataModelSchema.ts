import { z } from "zod";

export const dataModelSchema = z.array(
  z.object({
    id: z.string(),
    dataSourceId: z.string().nullish(),
    nameSingular: z.string(),
    namePlural: z.string(),
    labelSingular: z.string(),
    labelPlural: z.string(),
    description: z.string().nullish(),
    icon: z.string().nullish(),
    // Dropped from the metadata API in Twenty 2.12, so it is absent on newer servers.
    isCustom: z.boolean().nullish(),
    isActive: z.boolean().nullish(),
    isSystem: z.boolean().nullish(),
  }),
);

export const restCursorPageInfoSchema = z.object({
  hasNextPage: z.boolean().nullish(),
  startCursor: z.string().nullish(),
  endCursor: z.string().nullish(),
});

// Newer Twenty servers return `{ data: [...] }`, older ones wrap the list as
// `{ data: { objects: [...] } }`. Both are paginated by an id cursor.
export const getActiveDataModelsSchema = z.object({
  data: z.union([dataModelSchema, z.object({ objects: dataModelSchema })]),
  pageInfo: restCursorPageInfoSchema.nullish(),
});

export type DataModel = z.infer<typeof dataModelSchema>;
export type DataModelItem = DataModel[number];

export function extractDataModels(response: z.infer<typeof getActiveDataModelsSchema>): DataModel {
  return Array.isArray(response.data) ? response.data : response.data.objects;
}
