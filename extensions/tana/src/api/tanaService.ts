import {
  CalendarNodeResultSchema,
  ChildrenResult,
  ChildrenResultSchema,
  CreateTagResultSchema,
  ReadNodeResult,
  ReadNodeResultSchema,
  SearchNode,
  SearchNodesResultSchema,
  TagsResultSchema,
  TanaTag,
  TanaWorkspace,
  WorkspacesResultSchema,
  parseToolResultData,
  FieldDataType,
} from "./contracts";
import { TanaMcpClient } from "./TanaAPIClient";

const parseMarkdownResult = (result: Awaited<ReturnType<TanaMcpClient["callTool"]>>): ReadNodeResult => {
  try {
    return parseToolResultData(result, ReadNodeResultSchema);
  } catch {
    const markdown = result.content.find(
      (content): content is { type: "text"; text: string } => content.type === "text" && "text" in content,
    )?.text;
    if (markdown) return { markdown };
    throw new Error("Tana tool result did not match the expected schema");
  }
};

export const listWorkspaces = async (client: TanaMcpClient): Promise<TanaWorkspace[]> =>
  parseToolResultData(await client.callTool("list_workspaces", {}), WorkspacesResultSchema);

export const listTags = async (client: TanaMcpClient, workspaceId: string): Promise<TanaTag[]> =>
  parseToolResultData(await client.callTool("list_tags", { workspaceId }), TagsResultSchema);

export const getLocalDateString = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const getCalendarNodeId = async (
  client: TanaMcpClient,
  workspaceId: string,
  date = getLocalDateString(),
  signal?: AbortSignal,
) =>
  parseToolResultData(
    await client.callTool("get_or_create_calendar_node", { workspaceId, date, granularity: "day" }, signal),
    CalendarNodeResultSchema,
  ).nodeId;

export const searchNodes = async (
  client: TanaMcpClient,
  text: string,
  workspaceId?: string,
  limit = 50,
  signal?: AbortSignal,
): Promise<SearchNode[]> => {
  const query = text.trim();
  if (!query) return [];
  return parseToolResultData(
    await client.callTool(
      "search_nodes",
      {
        query: { textContains: query, ...(workspaceId ? { inWorkspace: workspaceId } : {}) },
        ...(workspaceId ? { workspaceIds: [workspaceId] } : {}),
        limit,
      },
      signal,
    ),
    SearchNodesResultSchema,
  );
};

export const readNode = async (
  client: TanaMcpClient,
  nodeId: string,
  maxDepth = 2,
  signal?: AbortSignal,
): Promise<ReadNodeResult> => {
  const result = await client.callTool("read_node", { nodeId, maxDepth }, signal);
  return parseMarkdownResult(result);
};

export const getChildren = async (
  client: TanaMcpClient,
  nodeId: string,
  offset = 0,
  limit = 100,
  signal?: AbortSignal,
): Promise<ChildrenResult> =>
  parseToolResultData(await client.callTool("get_children", { nodeId, offset, limit }, signal), ChildrenResultSchema);

export const setNodeDone = (client: TanaMcpClient, nodeId: string, done: boolean, signal?: AbortSignal) =>
  client.callTool(done ? "check_node" : "uncheck_node", { nodeId }, signal);

export const updateNodeTags = (
  client: TanaMcpClient,
  nodeId: string,
  tagIds: string[],
  action: "add" | "remove",
  signal?: AbortSignal,
) => client.callTool("tag", { nodeId, tagIds, action }, signal);

export const updateFieldContent = (
  client: TanaMcpClient,
  nodeId: string,
  attributeId: string,
  content: string | null,
  mode: "replace" | "append" = "replace",
  signal?: AbortSignal,
) => client.callTool("set_field_content", { nodeId, attributeId, content, mode }, signal);

export const updateFieldOption = (
  client: TanaMcpClient,
  nodeId: string,
  attributeId: string,
  optionId: string,
  mode: "replace" | "append" = "replace",
  signal?: AbortSignal,
) => client.callTool("set_field_option", { nodeId, attributeId, optionId, mode }, signal);

export const editNode = (
  client: TanaMcpClient,
  nodeId: string,
  values: {
    name?: { from: string; to: string | null };
    description?: { from: string; to: string | null };
  },
  signal?: AbortSignal,
) =>
  client.callTool(
    "edit_node",
    {
      nodeId,
      ...(values.name
        ? { name: { old_string: values.name.from, new_string: values.name.to ?? "", replace_all: true } }
        : {}),
      ...(values.description
        ? {
            description: {
              old_string: values.description.from,
              new_string: values.description.to ?? "",
              replace_all: true,
            },
          }
        : {}),
    },
    signal,
  );

export const trashNode = (client: TanaMcpClient, nodeId: string, signal?: AbortSignal) =>
  client.callTool("trash_node", { nodeId }, signal);

const collectChildIds = async (
  client: TanaMcpClient,
  nodeId: string,
  offset = 0,
  collected: string[] = [],
  signal?: AbortSignal,
): Promise<string[]> => {
  const page = await getChildren(client, nodeId, offset, 100, signal);
  const next = [...collected, ...page.children.map(({ id }) => id)];
  return page.hasMore ? collectChildIds(client, nodeId, offset + page.children.length, next, signal) : next;
};

export const isDescendant = async (
  client: TanaMcpClient,
  ancestorId: string,
  candidateId: string,
  pending: string[] = [ancestorId],
  visited: ReadonlySet<string> = new Set(),
  signal?: AbortSignal,
): Promise<boolean> => {
  if (!pending.length) return false;
  if (visited.size > 5_000) throw new Error("Move validation exceeded 5,000 descendants");
  const [current, ...remaining] = pending;
  if (visited.has(current)) return isDescendant(client, ancestorId, candidateId, remaining, visited, signal);
  const childIds = await collectChildIds(client, current, 0, [], signal);
  if (childIds.includes(candidateId)) return true;
  return isDescendant(
    client,
    ancestorId,
    candidateId,
    [...remaining, ...childIds],
    new Set([...visited, current]),
    signal,
  );
};

export const moveNodeSafely = async (
  client: TanaMcpClient,
  nodeId: string,
  targetNodeId: string,
  position: "start" | "end" = "end",
  signal?: AbortSignal,
) => {
  if (nodeId === targetNodeId) throw new Error("A node cannot be moved into itself");
  if (await isDescendant(client, nodeId, targetNodeId, [nodeId], new Set(), signal)) {
    throw new Error("A node cannot be moved into one of its descendants");
  }
  await client.moveNode(nodeId, targetNodeId, { position }, signal);
};

export const getTagSchema = async (client: TanaMcpClient, tagId: string, signal?: AbortSignal) => {
  const result = await client.callTool(
    "get_tag_schema",
    { tagId, includeEditInstructions: true, includeInheritedFields: true },
    signal,
  );
  return parseMarkdownResult(result);
};

export const createTag = async (
  client: TanaMcpClient,
  workspaceId: string,
  values: { name: string; description?: string; extendsTagIds?: string[]; showCheckbox?: boolean },
  signal?: AbortSignal,
) => {
  const result = await client.callTool("create_tag", { workspaceId, ...values }, signal);
  try {
    return parseToolResultData(result, CreateTagResultSchema);
  } catch {
    const created = (await listTags(client, workspaceId)).find(({ name }) => name === values.name);
    if (created) return { tagId: created.id, tagName: created.name };
    throw new Error("Tana created the Supertag but its ID could not be confirmed");
  }
};

export const addFieldToTag = async (
  client: TanaMcpClient,
  tagId: string,
  values: {
    name: string;
    description?: string;
    dataType: FieldDataType;
    sourceTagId?: string;
    options?: string[];
    defaultValue?: string | number | boolean;
    isMultiValue?: boolean;
  },
  signal?: AbortSignal,
) => client.callTool("add_field_to_tag", { tagId, ...values }, signal);

export const configureTagCheckbox = async (
  client: TanaMcpClient,
  tagId: string,
  showCheckbox: boolean,
  doneStateMapping?: { fieldId: string; checkedValues: string[]; uncheckedValues?: string[] },
  signal?: AbortSignal,
) => client.callTool("set_tag_checkbox", { tagId, showCheckbox, doneStateMapping }, signal);
