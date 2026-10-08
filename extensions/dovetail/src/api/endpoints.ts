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
  docs: {
    path: "/v1/docs",
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
          type: z.literal("doc"),
          created_at: z.string(),
          url: z.string().optional(),
          folder: z.object({ id: z.string() }).nullable().optional(),
        }),
      ),
    ),
  },
  projects: {
    path: "/v1/projects",
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
          type: z.literal("project"),
          created_at: z.string(),
          deleted: z.boolean(),
          url: z.string().optional(),
          author: z.object({ id: z.string(), name: z.string().nullable() }).nullable().optional(),
          folder: z.object({ id: z.string() }).nullable().optional(),
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
          url: z.string().optional(),
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

export const ExportDocResponse = z.object({
  id: z.string(),
  type: z.literal("doc"),
  title: z.string(),
  created_at: z.string(),
  content_markdown: z.string(),
});

// POST /v2/search — unlike the `endpoints` map above, this returns results grouped by
// content type rather than a single paginated array, so it's modeled separately.
export const SearchV2ContentTypes = [
  "AGENT",
  "CHANNEL",
  "DASHBOARD",
  "FOLDER",
  "HIGHLIGHT",
  "INSIGHT",
  "NOTE",
  "PERSON",
  "PROJECT",
  "TAG",
  "THEME",
] as const;

const searchV2ItemSchema = z.object({
  id: z.string(),
  url: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  preview_text: z.string().nullable().optional(),
  project_title: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const SearchV2Response = z.object({
  data: z.object({
    url: z.string(),
    total: z.number(),
    offset: z.number(),
    limit: z.number(),
    agents: z.array(searchV2ItemSchema).optional().default([]),
    highlights: z.array(searchV2ItemSchema).optional().default([]),
    tags: z.array(searchV2ItemSchema).optional().default([]),
    notes: z.array(searchV2ItemSchema).optional().default([]),
    insights: z.array(searchV2ItemSchema).optional().default([]),
    channels: z.array(searchV2ItemSchema).optional().default([]),
    dashboards: z.array(searchV2ItemSchema).optional().default([]),
    themes: z.array(searchV2ItemSchema).optional().default([]),
    projects: z.array(searchV2ItemSchema).optional().default([]),
    folders: z.array(searchV2ItemSchema).optional().default([]),
    people: z.array(searchV2ItemSchema).optional().default([]),
  }),
});

export type SearchV2Item = z.infer<typeof searchV2ItemSchema>;

export const FolderSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.literal("folder"),
  created_at: z.string(),
  url: z.string().optional(),
  parent_folder: z.object({ id: z.string() }).nullable().optional(),
});

export const FoldersResponse = paginationSchemaFactory(z.array(FolderSchema));

// GET /v1/folders/{folder_id}/contents — items are heterogeneous (project, doc, channel,
// dashboard, agent, or nested folder), discriminated by `type`.
export const FolderContentItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["project", "doc", "channel", "dashboard", "agent", "folder"]),
  created_at: z.string(),
  url: z.string().nullable().optional(),
  author_id: z.string().nullable().optional(),
});

export const FolderContentsResponse = paginationSchemaFactory(z.array(FolderContentItemSchema));

export type FolderContentItem = z.infer<typeof FolderContentItemSchema>;

export const CreateDataResponse = z.object({
  data: z.object({
    id: z.string(),
    type: z.literal("data"),
    title: z.string().nullable(),
    created_at: z.string(),
    url: z.string().optional(),
    project: z.object({ id: z.string(), title: z.string() }).optional(),
  }),
});

export const HighlightsResponse = paginationSchemaFactory(
  z.array(
    z.object({
      id: z.string(),
      url: z.string().nullable().optional(),
      note_id: z.string().nullable().optional(),
      text: z.string().nullable(),
      type: z.literal("highlight"),
      created_at: z.string(),
      tags: z
        .array(z.object({ id: z.string(), title: z.string() }))
        .optional()
        .default([]),
    }),
  ),
);

export const TagsResponse = paginationSchemaFactory(
  z.array(
    z.object({
      id: z.string(),
      url: z.string().optional(),
      title: z.string(),
      scope: z.enum(["project", "workspace"]),
      created_at: z.string(),
    }),
  ),
);

export const ChannelResponse = z.object({
  data: z.object({
    id: z.string(),
    title: z.string(),
    type: z.literal("channel"),
    created_at: z.string(),
    deleted: z.boolean(),
    url: z.string().optional(),
    folder: z.object({ id: z.string() }).nullable().optional(),
    topics: z.array(z.object({ id: z.string(), title: z.string(), description: z.string().optional() })).optional(),
  }),
});

export const ChannelThemesResponse = paginationSchemaFactory(
  z.array(
    z.object({
      id: z.string(),
      url: z.string().optional(),
      title: z.string(),
      summary: z.string().nullable().optional(),
      datum_count: z.number(),
      created_at: z.string(),
      topic: z.object({ id: z.string(), title: z.string() }).nullable().optional(),
    }),
  ),
);

export const ChannelDataResponse = paginationSchemaFactory(
  z.array(
    z.object({
      id: z.string(),
      url: z.string().optional(),
      source_timestamp: z.string(),
      text: z.string().nullable(),
      sentiment: z.enum(["POSITIVE", "NEGATIVE", "MIXED", "NEUTRAL"]).nullable().optional(),
      summary: z.string().nullable().optional(),
      source_url: z.string().nullable().optional(),
      themes: z.array(z.object({ id: z.string(), title: z.string() })).optional(),
    }),
  ),
);

export const SummarizeResponse = z.object({
  data: z.object({
    summary: z.string(),
    citations: z
      .array(
        z.object({
          id: z.string(),
          type: z.enum(["HIGHLIGHT", "INSIGHT", "NOTE", "THEME", "TAG"]),
          citation_id: z.number(),
        }),
      )
      .optional()
      .default([]),
  }),
});
