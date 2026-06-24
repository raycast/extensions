import { z } from "zod";

export const CORE_MCP_TOOLS = [
  "list_workspaces",
  "search_nodes",
  "read_node",
  "get_children",
  "list_tags",
  "get_tag_schema",
  "get_or_create_calendar_node",
  "tag",
  "set_field_option",
  "set_field_content",
  "import_tana_paste",
  "create_tag",
  "add_field_to_tag",
  "set_tag_checkbox",
  "check_node",
  "uncheck_node",
  "trash_node",
  "edit_node",
] as const;

export const OPTIONAL_MCP_TOOLS = ["open_node", "move_node"] as const;

export type CoreMcpTool = (typeof CORE_MCP_TOOLS)[number];
export type OptionalMcpTool = (typeof OPTIONAL_MCP_TOOLS)[number];
export type TanaTool = CoreMcpTool | OptionalMcpTool;

export type SearchQuery = {
  textContains?: string;
  inWorkspace?: string;
  hasType?: string | { typeId: string; includeExtensions?: boolean };
  childOf?: { nodeIds: string[]; recursive?: boolean; includeRefs?: boolean };
  is?: "done" | "todo" | "calendarNode" | "inLibrary";
  and?: SearchQuery[];
  or?: SearchQuery[];
  not?: SearchQuery;
};

export type FieldDataType =
  | "plain"
  | "number"
  | "date"
  | "url"
  | "email"
  | "checkbox"
  | "user"
  | "instance"
  | "options";

export type TanaToolArguments = {
  list_workspaces: Record<string, never>;
  search_nodes: { query: SearchQuery; workspaceIds?: string[]; limit?: number };
  read_node: { nodeId: string; maxDepth?: number };
  get_children: { nodeId: string; limit?: number; offset?: number };
  list_tags: { workspaceId: string; limit?: number };
  get_tag_schema: { tagId: string; includeEditInstructions?: boolean; includeInheritedFields?: boolean };
  get_or_create_calendar_node: {
    workspaceId: string;
    date?: string;
    granularity: "day" | "week" | "month" | "year";
  };
  tag: { nodeId: string; tagIds: string[]; action: "add" | "remove" };
  set_field_option: { nodeId: string; attributeId: string; optionId: string; mode?: "replace" | "append" };
  set_field_content: {
    nodeId: string;
    attributeId: string;
    content: string | null;
    mode?: "replace" | "append";
  };
  import_tana_paste: { parentNodeId: string; content: string };
  create_tag: {
    workspaceId: string;
    name: string;
    description?: string;
    extendsTagIds?: string[];
    showCheckbox?: boolean;
  };
  add_field_to_tag: {
    tagId: string;
    name: string;
    description?: string;
    dataType: FieldDataType;
    sourceTagId?: string;
    options?: string[];
    defaultValue?: string | number | boolean;
    isMultiValue?: boolean;
  };
  set_tag_checkbox: {
    tagId: string;
    showCheckbox: boolean;
    doneStateMapping?: { fieldId: string; checkedValues: string[]; uncheckedValues?: string[] };
  };
  check_node: { nodeId: string };
  uncheck_node: { nodeId: string };
  trash_node: { nodeId: string };
  edit_node: {
    nodeId: string;
    name?: { old_string: string; new_string: string; replace_all?: boolean };
    description?: { old_string: string; new_string: string; replace_all?: boolean };
  };
  open_node: { nodeId: string; openType?: "current" | "panel" | "tab" };
  move_node: {
    nodeId: string;
    targetNodeId: string;
    sourceParentId?: string;
    position?: "start" | "end" | "after" | "before";
    referenceNodeId?: string;
    keepSourceReference?: boolean;
  };
};

export const HealthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  timestamp: z.string(),
  nodeSpaceReady: z.boolean(),
});

export type TanaHealth = z.infer<typeof HealthSchema>;

export const WorkspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  homeNodeId: z.string().optional(),
});

export type TanaWorkspace = z.infer<typeof WorkspaceSchema>;

export const WorkspacesResultSchema = z
  .union([z.array(WorkspaceSchema), z.object({ workspaces: z.array(WorkspaceSchema) })])
  .transform((value) => (Array.isArray(value) ? value : value.workspaces));

export const TagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
});

export type TanaTag = z.infer<typeof TagSchema>;

export const TagsResultSchema = z
  .union([z.array(TagSchema), z.object({ tags: z.array(TagSchema) })])
  .transform((value) => (Array.isArray(value) ? value : value.tags));

export const CalendarNodeResultSchema = z.object({ nodeId: z.string().min(1) });

export const TagSchemaResultSchema = z.object({ markdown: z.string() });

export const CreateTagResultSchema = z.object({
  tagId: z.string().min(1),
  tagName: z.string().min(1),
  message: z.string().optional(),
});

export const AddFieldResultSchema = z.object({
  tagId: z.string(),
  tagName: z.string().optional(),
  fieldId: z.string().min(1),
  fieldName: z.string().min(1),
  dataType: z.string(),
  message: z.string().optional(),
});

export const SetTagCheckboxResultSchema = z.object({
  tagId: z.string(),
  tagName: z.string().optional(),
  showCheckbox: z.boolean(),
  hasDoneStateMapping: z.boolean().optional(),
  message: z.string().optional(),
});

export const NodeSummarySchema = z
  .object({
    id: z.string().optional(),
    nodeId: z.string().optional(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    workspaceId: z.string().optional(),
    breadcrumb: z.union([z.string(), z.array(z.string())]).optional(),
    path: z.string().optional(),
    done: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.id || value.nodeId), "Node response has no ID");

export type TanaNodeSummary = z.infer<typeof NodeSummarySchema>;

export const SearchNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  breadcrumb: z.array(z.string()).default([]),
  tags: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
  tagIds: z.array(z.string()).default([]),
  workspaceId: z.string(),
  docType: z.string().optional(),
  description: z.string().optional(),
  created: z.string().optional(),
  inTrash: z.boolean().default(false),
});

export type SearchNode = z.infer<typeof SearchNodeSchema>;

export const SearchNodesResultSchema = z
  .union([
    z.array(SearchNodeSchema),
    z.object({ nodes: z.array(SearchNodeSchema) }),
    z.object({ results: z.array(SearchNodeSchema) }),
  ])
  .transform((value) => (Array.isArray(value) ? value : "nodes" in value ? value.nodes : value.results));

export const ReadNodeResultSchema = z.object({
  markdown: z.string(),
  name: z.string().optional(),
  description: z.string().nullish(),
});

export type ReadNodeResult = z.infer<typeof ReadNodeResultSchema>;

export const ChildNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  tags: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
  tagIds: z.array(z.string()).default([]),
  childCount: z.number().default(0),
  docType: z.string().optional(),
  description: z.string().optional(),
  created: z.string().optional(),
  inTrash: z.boolean().default(false),
});

export const ChildrenResultSchema = z.object({
  children: z.array(ChildNodeSchema),
  total: z.number(),
  hasMore: z.boolean(),
});

export type ChildrenResult = z.infer<typeof ChildrenResultSchema>;

export const ToolDescriptorSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  inputSchema: z.record(z.unknown()).optional(),
});

export type ToolDescriptor = z.infer<typeof ToolDescriptorSchema>;

export const McpTextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const McpToolResultSchema = z.object({
  isError: z.boolean().optional(),
  content: z.array(z.union([McpTextContentSchema, z.object({ type: z.string() }).passthrough()])).default([]),
  structuredContent: z.unknown().optional(),
});

export type McpToolResult = z.infer<typeof McpToolResultSchema>;

export const parseToolResultData = <Schema extends z.ZodTypeAny>(
  result: McpToolResult,
  schema: Schema,
): z.output<Schema> => {
  const structured = schema.safeParse(result.structuredContent);
  if (structured.success) return structured.data;

  const text = result.content.reduce<string | undefined>(
    (message, content) => message ?? ("text" in content && typeof content.text === "string" ? content.text : undefined),
    undefined,
  );
  if (text) {
    try {
      return schema.parse(JSON.parse(text));
    } catch {
      // Fall through to a stable protocol error below.
    }
  }
  throw new Error("Tana tool result did not match the expected schema");
};

export const ImportResultSchema = z.object({
  createdNodes: z
    .array(
      z.object({
        nodeId: z.string(),
        name: z.string().optional(),
      }),
    )
    .default([]),
});

export type ImportResult = z.infer<typeof ImportResultSchema>;
