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
  customXML: z.boolean().default(false),
  dynamicFields: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("text"),
        nameFriendly: z.string(),
        name: z.string(),
        default: z.string().default(""),
      }),
      z.object({
        type: z.literal("dropdown"),
        nameFriendly: z.string(),
        name: z.string(),
        default: z.string().default(""),
        values: z.string().array(),
      }),
    ])
    .array()
    .default([]),
});
export type Snippet = z.infer<typeof ZSnippet>;
export type SnippetWithPath = Snippet & { path: string };

export const ZLocation = z.object({
  id: z.string().uuid(),
  path: z.string(),
  name: z.string(),
  git: z.boolean().default(false),
});
export type Location = z.infer<typeof ZLocation>;

export const zLaunchContext = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("my"), // a user to copy their own snippets
    id: z.string(),
    showForm: z.boolean().default(true),
    values: z.record(z.string(), z.string()).default({}),
  }),
  z.object({
    type: z.literal("import"),
    snippet: z
      .string()
      .url()
      .or(ZSnippet.omit({ locId: true })),
    action: z.enum(["import", "copy"]).default("import"),
    showForm: z.boolean().default(true),
    values: z.record(z.string(), z.string()).default({}),
  }),
]);
