import { Icon } from "@raycast/api";
import { z } from "zod";

export const RateLimitResourceSchema = z.object({
  limit: z.number(),
  used: z.number(),
  remaining: z.number(),
  reset: z.number(),
});

export const RateLimitResponseSchema = z.object({
  resources: z.object({
    core: RateLimitResourceSchema,
    search: RateLimitResourceSchema,
    graphql: RateLimitResourceSchema,
    code_search: RateLimitResourceSchema.optional(),
    integration_manifest: RateLimitResourceSchema.optional(),
  }),
});

export type RateLimitResource = z.infer<typeof RateLimitResourceSchema>;
export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;

export const RESOURCE_ORDER = [
  "core",
  "graphql",
  "search",
  "code_search",
  "integration_manifest",
] as const;

export const RESOURCE_LABELS: Record<string, string> = {
  core: "Core",
  graphql: "GraphQL",
  search: "Search",
  code_search: "Code Search",
  integration_manifest: "Integration Manifest",
};

export const RESOURCE_ICONS: Record<string, Icon> = {
  core: Icon.Code,
  graphql: Icon.BarChart,
  search: Icon.List,
  code_search: Icon.Book,
  integration_manifest: Icon.Gear,
};
