import { z } from "zod";

export const PageSize = 50;
export const BaseUrl = "https://dovetail.com/api";

export const buildHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export type EndpointReturnType<Endpoint extends ApiEndpoint> = z.infer<Endpoint["schema"]>;
export type EndpointData<Endpoint extends ApiEndpoint> = EndpointReturnType<Endpoint>["data"][number];

const paginationSchemaFactory = <T extends z.ZodTypeAny>(dataSchema: z.ZodArray<T>) =>
  z.object({
    data: dataSchema,
    page: z.object({
      total_count: z.number(),
      has_more: z.boolean(),
      next_cursor: z.string().nullable(),
    }),
  });

const FieldValueSchema = z.union([z.string(), z.boolean(), z.number(), z.array(z.string())]).nullable();
const FieldSchema = z.object({ label: z.string(), value: FieldValueSchema });

export type Field = z.infer<typeof FieldSchema>;

export const endpoints = {
  insights: {
    path: "/v1/insights",
    method: "GET",
    buildFilter: (query: string) => ({
      title: {
        contains: query,
      },
    }),
    schema: paginationSchemaFactory(
      z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          type: z.literal("insight"),
          created_at: z.string(),
          published: z.boolean(),
        }),
      ),
    ),
  },
  contacts: {
    path: "/v1/contacts",
    method: "GET",
    buildFilter: (query: string) => ({
      name: {
        contains: query,
      },
    }),
    schema: paginationSchemaFactory(
      z.array(
        z.object({
          id: z.string(),
          name: z.string().nullable(),
          created_at: z.string(),
          fields: z.array(FieldSchema),
        }),
      ),
    ),
  },
  data: {
    path: "/v1/data",
    method: "GET",
    buildFilter: (query: string) => ({
      title: {
        contains: query,
      },
    }),
    schema: paginationSchemaFactory(
      z.array(
        z.object({
          id: z.string(),
          type: z.literal("data"),
          title: z.string(),
          created_at: z.string(),
          deleted: z.boolean(),
        }),
      ),
    ),
  },
};

export type ApiEndpoint = (typeof endpoints)[keyof typeof endpoints];

export const ExportDataResponse = z.object({
  id: z.string(),
  type: z.literal("data"),
  title: z.string(),
  created_at: z.string(),
  deleted: z.boolean(),
  content_markdown: z.string(),
});
