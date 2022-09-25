import { z } from "zod";

export const ZSnippetType = z.enum(["unknown", "script", "scriptSteps", "layoutObjectList"]);
export type SnippetType = z.infer<typeof ZSnippetType>;
export const snippetTypesMap: Record<SnippetType, string> = {
  script: "Script",
  scriptSteps: "Script Step(s)",
  layoutObjectList: "Layout Object(s)",
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
};
