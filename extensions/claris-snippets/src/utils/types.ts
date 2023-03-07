import { z } from "zod";

export const ZSnippetType = z.enum([
  "unknown",
  "script",
  "scriptSteps",
  "layout",
  "group",
  "field",
  "customFunction",
  "baseTable",
  "valueList",
  "layoutObjectList",
]);
export type SnippetType = z.infer<typeof ZSnippetType>;
export const snippetTypesMap: Record<SnippetType, string> = {
  script: "Script",
  scriptSteps: "Script Step(s)",
  layoutObjectList: "Layout Object(s)",
  layout: "Layout",
  group: "Group",
  baseTable: "Base Table",
  field: "Field",
  customFunction: "Custom Function",
  valueList: "Value List",
  unknown: "Unknown",
};

export const ZSnippet = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: ZSnippetType,
  snippet: z.string(),
  tags: z.string().array().default([]),
  description: z.string().default(""),
  locId: z.string().default("default"),
});
export type Snippet = z.infer<typeof ZSnippet>;
export type SnippetWithPath = Snippet & { path: string };

export type Location = {
  id: string;
  path: string;
  name: string;
  git?: boolean;
};
