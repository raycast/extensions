import { z } from "zod";

export const tokenInfo = {
  path: "/v1/token-info",
  method: "GET",
  schema: z.object({
    id: z.string(),
    scopes: z.array(z.string()),
    expires_at: z.string().datetime(),
  }),
};

export const insights = {
  path: "/v1/insights",
  method: "GET",
  schema: z.object({
    data: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.string(),
        created_at: z.string(),
        published: z.boolean(),
      })
    ),
  }),
};

export const notes = {
  path: "/v1/search",
  method: "POST",
  schema: z.object({
    data: z.object({
      notes: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          project_title: z.string(),
          created_at: z.string(),
        })
      ),
      pageInfo: z
        .object({
          hasNextPage: z.boolean(),
          endCursor: z.string().nullable(),
        })
        .optional(),
    }),
  }),
};

export const contacts = {
  path: "/v1/contacts",
  method: "GET",
  schema: z.object({
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        created_at: z.string().optional(),
        deleted: z.boolean().optional(),
      })
    ),
  }),
};

export const contactDetails = {
  path: (id: string) => `/v1/contacts/${id}`,
  method: "GET",
  schema: z.object({
    data: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable().optional(),
      created_at: z.string().optional(),
      deleted: z.boolean().optional(),
      fields: z.array(z.record(z.any())).optional(),
    }),
  }),
};

export const projects = {
  path: "/v1/projects",
  method: "GET",
  schema: z.object({
    data: z.object({
      projects: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          created_at: z.string().optional(),
        })
      ),
      pageInfo: z
        .object({
          hasNextPage: z.boolean(),
          endCursor: z.string().nullable(),
        })
        .optional(),
    }),
  }),
};

export const channels = {
  path: "/v1/channels",
  method: "GET",
  schema: z.object({
    data: z.object({
      channels: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
        })
      ),
      pageInfo: z
        .object({
          hasNextPage: z.boolean(),
          endCursor: z.string().nullable(),
        })
        .optional(),
    }),
  }),
};

export const summarize = {
  path: "/v1/summarize",
  method: "POST",
  schema: z.object({
    data: z.object({
      summary: z.string(),
      notes: z.array(z.string()).optional(),
    }),
  }),
};

export const data = {
  path: "/v1/data",
  method: "GET",
  schema: z.object({
    data: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        title: z.string(),
        created_at: z.string(),
        deleted: z.boolean(),
      })
    ),
  }),
};

export const endpoints = { tokenInfo, insights, notes, contacts, contactDetails, projects, channels, summarize, data };
export type EndpointKey = keyof typeof endpoints; 