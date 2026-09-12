import type {
  RawLogEntry,
  CompletionChunk,
  CompletionToolMessage,
  LogEntry,
  GroupedLogEntry,
  SubAgentGroup,
  ToolGroup,
  StandaloneEntry,
} from "./events";
import { isCompletionChunk, isToolMessage, isUserMessage } from "./events";

// --- Constants ---

const SHELL_TOOLS = [
  "bash",
  "write_bash",
  "read_bash",
  "stop_bash",
  "list_bash",
  "async_bash",
  "read_async_bash",
  "stop_async_bash",
  "powershell",
  "write_powershell",
  "read_powershell",
  "stop_powershell",
  "list_powershell",
];

export function isShellTool(toolName: string): boolean {
  return SHELL_TOOLS.includes(toolName);
}

const SETUP_TOOLS = ["run_custom_setup_step", "run_setup"];

const AGENT_START_MARKERS = ["▶️ Begin subagent", "▶️ Begin custom agent"];
const AGENT_END_MARKERS = ["⏹️ End subagent", "⏹️ End custom agent"];

/** Display config for grouped tools - title templates */
export const TOOL_GROUP_DISPLAY: Record<string, (count: number) => string> = {
  apply_patch: (n) => `Apply ${n} patches`,
  str_replace_editor: (n) => `Edit ${n} files`,
  str_replace: (n) => `Edit ${n} files`,
  edit: (n) => `Edit ${n} files`,
  create: (n) => `Create ${n} files`,
  view: (n) => `View ${n} files`,
  insert: (n) => `Insert at ${n} locations`,
  undo_edit: (n) => `Undo ${n} edits`,
  grep: (n) => `Search ${n} times`,
  rg: (n) => `Search ${n} times`,
  glob: () => "Find files",
  web_search: (n) => `Web search ${n} times`,
  web_fetch: (n) => `Fetch ${n} URLs`,
  commit_changes: (n) => `Commit ${n} changes`,
  code_review: (n) => `Review ${n} changes`,
  parallel_validation: () => "Check changes with Copilot code review and CodeQL",
  run_custom_setup_step: () => "Setting up environment",
  run_setup: () => "Setting up environment",
  think: (n) => `Thought ${n} times`,
  skill: (n) => `Activate ${n} skills`,
  report_progress: (n) => `${n} progress updates`,
  task: (n) => `Run ${n} subagent tasks`,
  store_memory: () => "Store memory",
};

// --- Log Processing ---

/**
 * Process raw SSE log entries into normalized LogEntry objects.
 *
 * Pipeline:
 * 1. Deduplicate CompletionChunks by ID (merge same-ID chunks)
 * 2. Build toolCallId → chunkId mapping
 * 3. Merge CompletionToolMessage results into parent chunks
 * 4. Convert chunks to LogEntry[], preserving first-seen order
 */
export function processLogs(rawEntries: RawLogEntry[]): LogEntry[] {
  // Track first-seen order and deduplicate chunks by ID
  const chunkMap = new Map<string, CompletionChunk>();
  const orderedItems: Array<{ type: "chunk"; id: string } | { type: "user"; content: string; agentId?: string }> = [];
  const seenChunkIds = new Set<string>();

  // Also collect tool result messages for merging
  const toolMessages: CompletionToolMessage[] = [];

  for (const entry of rawEntries) {
    if (isCompletionChunk(entry)) {
      if (!seenChunkIds.has(entry.id)) {
        seenChunkIds.add(entry.id);
        chunkMap.set(entry.id, deepCloneChunk(entry));
        orderedItems.push({ type: "chunk", id: entry.id });
      } else {
        // Merge into existing chunk
        mergeChunks(chunkMap.get(entry.id)!, entry);
      }
    } else if (isToolMessage(entry)) {
      toolMessages.push(entry);
    } else if (isUserMessage(entry)) {
      orderedItems.push({ type: "user", content: entry.content, agentId: entry.agentId });
    }
  }

  // Build toolCallId → chunkId map
  const toolCallIdToChunkId = new Map<string, string>();
  for (const [chunkId, chunk] of chunkMap) {
    for (const choice of chunk.choices) {
      for (const tc of choice.delta.tool_calls ?? []) {
        if (tc.id) toolCallIdToChunkId.set(tc.id, chunkId);
      }
    }
  }

  // Merge tool results into their parent chunks
  for (const msg of toolMessages) {
    const chunkId = toolCallIdToChunkId.get(msg.tool_call_id);
    if (!chunkId) continue;
    const chunk = chunkMap.get(chunkId);
    if (!chunk) continue;

    for (const choice of chunk.choices) {
      const tc = (choice.delta.tool_calls ?? []).find((t) => t.id === msg.tool_call_id);
      if (tc?.function) {
        tc.function.result = msg.content;
        break;
      }
    }
  }

  // Convert to LogEntry[] in first-seen order
  const entries: LogEntry[] = [];

  for (const item of orderedItems) {
    if (item.type === "user") {
      // Skip overly long system/user messages (initial prompts)
      if (item.content.length > 500) continue;
      entries.push({
        id: `user-${entries.length}`,
        timestamp: "",
        type: "user_message",
        content: item.content,
        agentId: item.agentId,
      });
      continue;
    }

    const chunk = chunkMap.get(item.id)!;
    for (const choice of chunk.choices) {
      const toolCalls = choice.delta.tool_calls ?? [];
      const content = choice.delta.content;

      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          const name = tc.function?.name ?? "unknown";

          // Skip `task` tool calls — subagent execution is shown via SubAgentGroup entries
          if (name === "task") continue;

          const argsStr = tc.function?.arguments;

          let args: Record<string, unknown> | undefined;
          try {
            args = argsStr ? JSON.parse(argsStr) : undefined;
          } catch {
            args = argsStr ? { raw: argsStr } : undefined;
          }

          // Determine the result: prefer function.result, fall back to choice content
          const result = tc.function?.result ?? (content && content.trim() ? content : undefined);

          entries.push({
            id: `${chunk.id}-${tc.id}`,
            timestamp: String(chunk.created),
            type: "tool_call",
            toolName: name,
            toolCallId: tc.id,
            arguments: args,
            result: typeof result === "string" ? result : undefined,
            agentId: chunk.agentId,
          });
        }
      } else if (content && content.trim()) {
        // Skip subagent preamble messages
        if (content.includes("All messages from here to") || content.includes("All messages from here back to")) {
          continue;
        }
        // Skip diff output echoes
        if (content.trimStart().startsWith("diff --git")) continue;
        // Skip PR title suggestion messages
        if (content.trimStart().startsWith("<pr_title>")) continue;

        entries.push({
          id: `${chunk.id}-msg`,
          timestamp: String(chunk.created),
          type: "assistant_message",
          content,
          agentId: chunk.agentId,
        });
      }
    }
  }

  return entries;
}

/** Deep clone a CompletionChunk to avoid mutating the original */
function deepCloneChunk(chunk: CompletionChunk): CompletionChunk {
  return {
    ...chunk,
    choices: chunk.choices.map((c) => ({
      ...c,
      delta: {
        ...c.delta,
        tool_calls: c.delta.tool_calls?.map((tc) => ({
          ...tc,
          function: tc.function ? { ...tc.function } : undefined,
        })),
      },
    })),
  };
}

/**
 * Merge a new chunk into an existing chunk with the same ID.
 * Results for individual tool calls come as separate SSE lines with the same
 * chunk ID but in a new choice at index 0 — so we match by tool_call_id
 * across ALL existing choices rather than by choice index.
 */
function mergeChunks(existing: CompletionChunk, incoming: CompletionChunk): void {
  for (const incomingChoice of incoming.choices) {
    const incomingTCs = incomingChoice.delta.tool_calls ?? [];
    const incomingContent = incomingChoice.delta.content;

    if (incomingTCs.length > 0) {
      // For each incoming tool call, find the matching existing tool call by ID
      for (const incomingTC of incomingTCs) {
        let matched = false;

        for (const existingChoice of existing.choices) {
          const existingTCs = existingChoice.delta.tool_calls ?? [];
          const existingTC = existingTCs.find((tc) => tc.id === incomingTC.id);

          if (existingTC) {
            // Merge function data
            if (incomingTC.function) {
              if (!existingTC.function) {
                existingTC.function = { ...incomingTC.function };
              } else {
                if (incomingTC.function.name) existingTC.function.name = incomingTC.function.name;
                if (incomingTC.function.arguments) existingTC.function.arguments = incomingTC.function.arguments;
                if (incomingTC.function.result) existingTC.function.result = incomingTC.function.result;
              }
            }
            // The result for this tool call comes as content on the incoming choice
            if (incomingContent && !existingTC.function?.result) {
              existingTC.function = existingTC.function ?? { name: "" };
              existingTC.function.result = incomingContent;
            }
            matched = true;
            break;
          }
        }

        if (!matched) {
          // New tool call not seen before — add to first choice with tool_calls, or create new choice
          const targetChoice = existing.choices.find((c) => c.delta.tool_calls && c.delta.tool_calls.length > 0);
          if (targetChoice) {
            targetChoice.delta.tool_calls = targetChoice.delta.tool_calls ?? [];
            targetChoice.delta.tool_calls.push({
              ...incomingTC,
              function: incomingTC.function ? { ...incomingTC.function } : undefined,
            });
          } else {
            existing.choices.push({
              ...incomingChoice,
              delta: {
                ...incomingChoice.delta,
                tool_calls: incomingTCs.map((tc) => ({
                  ...tc,
                  function: tc.function ? { ...tc.function } : undefined,
                })),
              },
            });
          }
        }
      }
    } else if (incomingContent) {
      // Content-only choice (assistant narration) — store in first content-only choice
      const contentChoice = existing.choices.find((c) => !c.delta.tool_calls || c.delta.tool_calls.length === 0);
      if (contentChoice) {
        contentChoice.delta.content = incomingContent;
      }
    }
  }

  // Preserve agentId
  if (incoming.agentId) existing.agentId = incoming.agentId;
}

// --- Subagent Grouping ---
// Uses agentId field (like github-ui) to group entries by subagent,
// with start/end markers providing metadata.

/** Check if a tool call is a subagent start marker */
function isSubAgentStartMarker(entry: LogEntry): boolean {
  if (entry.type !== "tool_call" || !SETUP_TOOLS.includes(entry.toolName ?? "")) return false;
  const name = entry.arguments?.name as string | undefined;
  return name !== undefined && AGENT_START_MARKERS.some((marker) => name.includes(marker));
}

/** Check if a tool call is a subagent end marker */
function isSubAgentEndMarker(entry: LogEntry): boolean {
  if (entry.type !== "tool_call" || !SETUP_TOOLS.includes(entry.toolName ?? "")) return false;
  const name = entry.arguments?.name as string | undefined;
  return name !== undefined && AGENT_END_MARKERS.some((marker) => name.includes(marker));
}

/** Extract agent name from a start marker */
function extractAgentName(entry: LogEntry): string {
  const name = (entry.arguments?.name as string) ?? "";
  const match = name.match(/Begin (?:subagent|custom agent):\s*(.+)$/i);
  return match ? match[1].trim() : "Subagent";
}

/**
 * Groups log entries by subagent using the agentId field (Map-based approach).
 * Entries with the same agentId are grouped together.
 * Start/end markers provide the agent name and pending status.
 */
export function groupSubAgentEntries(entries: LogEntry[]): (LogEntry | SubAgentGroup)[] {
  const result: (LogEntry | SubAgentGroup)[] = [];
  const agentGroups = new Map<string, SubAgentGroup>();

  for (const entry of entries) {
    // Check for subagent start marker
    if (isSubAgentStartMarker(entry)) {
      const agentId = entry.agentId;
      if (agentId && !agentGroups.has(agentId)) {
        const group: SubAgentGroup = {
          kind: "subagent",
          id: `subagent-${agentId}`,
          agentName: extractAgentName(entry),
          entries: [],
          isPending: true,
        };
        agentGroups.set(agentId, group);
        result.push(group);
      } else if (agentId && agentGroups.has(agentId)) {
        // Update agent name if we see the marker later
        agentGroups.get(agentId)!.agentName = extractAgentName(entry);
      }
      continue; // Don't add marker itself to entries
    }

    // Check for subagent end marker
    if (isSubAgentEndMarker(entry)) {
      const agentId = entry.agentId;
      if (agentId) {
        const group = agentGroups.get(agentId);
        if (group) group.isPending = false;
      }
      continue; // Don't add marker itself to entries
    }

    // Route entry to its subagent group or root
    const agentId = entry.agentId;
    if (agentId) {
      let group = agentGroups.get(agentId);
      if (!group) {
        // Create group on first entry if we haven't seen a start marker yet
        group = {
          kind: "subagent",
          id: `subagent-${agentId}`,
          agentName: "Subagent",
          entries: [],
          isPending: true,
        };
        agentGroups.set(agentId, group);
        result.push(group);
      }
      group.entries.push(entry);
    } else {
      result.push(entry);
    }
  }

  // Filter out empty subagent groups
  return result.filter((item) => {
    if ("kind" in item && (item as SubAgentGroup).kind === "subagent") {
      return (item as SubAgentGroup).entries.length > 0;
    }
    return true;
  });
}

// --- Consecutive Tool Grouping ---

function isSetupTool(toolName: string): boolean {
  return SETUP_TOOLS.includes(toolName);
}

function getToolGroupTitle(toolName: string, count: number): string {
  const titleFn = TOOL_GROUP_DISPLAY[toolName];
  if (titleFn) return titleFn(count);
  return `${toolName} (${count} calls)`;
}

/**
 * Groups consecutive tool calls of the same type.
 * Shell tools are always standalone. Setup tools group together.
 */
export function groupConsecutiveTools(entries: (LogEntry | SubAgentGroup)[]): GroupedLogEntry[] {
  const result: GroupedLogEntry[] = [];
  let currentGroup: { toolName: string; isSetup: boolean; entries: LogEntry[] } | null = null;

  function flushGroup() {
    if (!currentGroup || currentGroup.entries.length === 0) return;

    if (currentGroup.entries.length === 1) {
      result.push({ kind: "standalone", entry: currentGroup.entries[0] } as StandaloneEntry);
    } else {
      const displayName = currentGroup.isSetup ? "run_setup" : currentGroup.toolName;
      result.push({
        kind: "tool_group",
        id: `toolgroup-${currentGroup.entries[0].id}`,
        toolName: currentGroup.toolName,
        title: getToolGroupTitle(displayName, currentGroup.entries.length),
        entries: currentGroup.entries,
      } as ToolGroup);
    }
    currentGroup = null;
  }

  for (const entry of entries) {
    // SubAgentGroup passes through directly
    if ("kind" in entry && (entry as SubAgentGroup).kind === "subagent") {
      flushGroup();
      result.push(entry as SubAgentGroup);
      continue;
    }

    const logEntry = entry as LogEntry;

    // Only tool calls can be grouped
    if (logEntry.type !== "tool_call" || !logEntry.toolName) {
      flushGroup();
      result.push({ kind: "standalone", entry: logEntry } as StandaloneEntry);
      continue;
    }

    const toolName = logEntry.toolName;

    // Shell tools are always standalone
    if (isShellTool(toolName)) {
      flushGroup();
      result.push({ kind: "standalone", entry: logEntry } as StandaloneEntry);
      continue;
    }

    const isSetup = isSetupTool(toolName);

    // Check if we can continue the current group
    if (currentGroup) {
      const sameSetup = isSetup && currentGroup.isSetup;
      const sameTool = !isSetup && !currentGroup.isSetup && currentGroup.toolName === toolName;

      if (sameSetup || sameTool) {
        currentGroup.entries.push(logEntry);
        continue;
      }
    }

    // Start a new group
    flushGroup();
    currentGroup = { toolName, isSetup, entries: [logEntry] };
  }

  flushGroup();
  return result;
}

// --- Full Pipeline ---

/**
 * Complete processing pipeline: raw SSE log entries → grouped display entries.
 */
export function processAndGroupLogs(rawEntries: RawLogEntry[]): GroupedLogEntry[] {
  const logEntries = processLogs(rawEntries);
  const subAgentGrouped = groupSubAgentEntries(logEntries);
  return groupConsecutiveTools(subAgentGrouped);
}
