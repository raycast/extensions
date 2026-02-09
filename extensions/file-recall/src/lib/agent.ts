/**
 * ReAct Agent Loop: The LLM autonomously reasons, calls tools, observes results,
 * and iterates until it has found the files the user is looking for.
 */

import { ChatMessage, AgentStep, AgentResult } from "./types";
import { chatCompletion, resetFunctionCallingState } from "./llm";
import {
  TOOL_DEFINITIONS,
  executeTool,
  resetFileRegistry,
  getRegisteredFiles,
} from "./tools";

const MAX_ITERATIONS = 12;

export type OnStepCallback = (step: AgentStep) => void;

/**
 * Time-related words in Chinese, English, and common patterns.
 * If the user's query contains none of these, we strip date params from search_files.
 */
const TIME_WORDS = [
  // Chinese
  "昨天",
  "今天",
  "前天",
  "上周",
  "本周",
  "这周",
  "上个月",
  "这个月",
  "去年",
  "今年",
  "最近",
  "刚才",
  "上午",
  "下午",
  "早上",
  "晚上",
  "月",
  "年",
  "周",
  "天前",
  "小时前",
  // English
  "yesterday",
  "today",
  "last week",
  "this week",
  "last month",
  "this month",
  "last year",
  "this year",
  "recent",
  "ago",
  "morning",
  "afternoon",
  // Date patterns
  "2024",
  "2025",
  "2026",
  "2027",
];

/**
 * Check if user query mentions any time reference.
 */
function queryMentionsTime(query: string): boolean {
  const lower = query.toLowerCase();
  return TIME_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

/**
 * Check if user query mentions a project/directory name.
 * We detect this by looking for patterns like "xxx的", "xxx project", or names with hyphens.
 * This is a heuristic — the LLM may still call find_directories, but we only block
 * date_after/date_before which is the most common hallucination.
 */

/**
 * Build the system prompt for the agent.
 */
function buildSystemPrompt(): string {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const dayOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][now.getDay()];
  const yesterdayStr = new Date(now.getTime() - 86400000)
    .toISOString()
    .split("T")[0];
  const twoDaysAgoStr = new Date(now.getTime() - 2 * 86400000)
    .toISOString()
    .split("T")[0];
  const twoWeeksAgoStr = new Date(now.getTime() - 14 * 86400000)
    .toISOString()
    .split("T")[0];
  const lastMonthStr = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];

  const lines = [
    `You are a File Recall AI Agent running on macOS. Today is ${todayStr} (${dayOfWeek}).`,
    `The user is trying to find a file on their computer using fuzzy memory. You have tools to search, read, and verify files.`,
    ``,
    `## RULE #1: ONLY USE WHAT THE USER SAID`,
    ``,
    `This is the most important rule. You MUST follow it strictly:`,
    `- ONLY search for keywords the user actually typed. You may add direct translations (日志→log) but NOTHING else.`,
    `- If the user did NOT mention a time → do NOT add date_after or date_before.`,
    `- If the user did NOT mention a project/directory name → do NOT call find_directories.`,
    `- If the user did NOT mention a file type → do NOT add file_types (or infer from context, e.g. "日志" implies log/txt).`,
    `- NEVER add information from your training data, examples, or assumptions.`,
    ``,
    `## YOUR TOOLS`,
    ``,
    `You have 8 tools. Use them strategically:`,
    ``,
    `| Tool | Purpose | When to use |`,
    `|------|---------|-------------|`,
    `| search_files | Find files by keywords, name, type, date | Always: first step of any search |`,
    `| find_directories | Find project/system directories | When user mentions a specific project name |`,
    `| read_file_preview | Read file content with offset/search | To verify a file's content matches user intent |`,
    `| grep_files | Search text patterns inside files | To check which files contain specific content |`,
    `| get_file_metadata | Get metadata: title, author, EXIF, GPS, camera, duration, screenshot info | For images, videos, audio, PDFs, Office docs |`,
    `| analyze_image | **AI vision**: see what an image actually shows | When user describes image by VISUAL CONTENT |`,
    `| list_recent_files | Find recently modified files | When user says "recent", "just now", "最近" |`,
    `| finish | Present final ranked results | When you've identified the best matches |`,
    ``,
    `## STRATEGY`,
    ``,
    `### Phase 1: Search`,
    `1. Parse ONLY what the user said. Map their words to search parameters:`,
    `   - Keywords: the user's words + direct translations (Chinese↔English)`,
    `   - File types: only if user mentioned or strongly implied (e.g. "日志"→log,txt; "表格"→xlsx,csv)`,
    `   - Time: only if user explicitly mentioned a time reference`,
    `   - Directory: only if user explicitly mentioned a project/system name`,
    `2. If user mentioned a time reference, convert to ISO dates (today is ${todayStr}):`,
    `   "昨天"→date_after=${yesterdayStr},date_before=${todayStr} | "今天"→date_after=${todayStr}`,
    `   "前天"→date_after=${twoDaysAgoStr},date_before=${yesterdayStr} | "上周"→date_after=${twoWeeksAgoStr}`,
    `   "上个月"→date_after=${lastMonthStr}`,
    `3. If user mentioned a project name, call find_directories first, then search within it.`,
    `4. Call search_files with ONLY the parameters you identified. Do not over-constrain.`,
    `5. If no results, try broader: remove filters one by one, try name_pattern, try ~/Downloads.`,
    ``,
    `### Phase 2: Content Verification (important for accuracy!)`,
    `After search_files returns results, VERIFY top candidates before finishing:`,
    ``,
    `- **If user described file by content** (e.g. "包含XX的文件", "记录了XX的文档"):`,
    `  → Use grep_files to check which files actually contain the described content.`,
    `  → Boost scores for files with matching content.`,
    ``,
    `- **If results include PDFs/Office docs**:`,
    `  → Use get_file_metadata to read title/author — much more informative than filename alone.`,
    ``,
    `- **If results include images/photos**:`,
    `  → If user described image by VISUAL CONTENT (e.g. "有架构图的截图", "显示报错的图片", "那张有猫的照片"):`,
    `    → Use analyze_image on top 1-3 candidates to verify visual content.`,
    `    → analyze_image uses AI vision to actually SEE the image. Very accurate but costs tokens.`,
    `  → If user described image by metadata (e.g. "iPhone拍的", "昨天的截图"):`,
    `    → Use get_file_metadata for EXIF (camera model, GPS, dimensions, screenshot detection).`,
    `  → Screenshots have kMDItemIsScreenCapture=1. Photos have camera/GPS info.`,
    ``,
    `- **If results include videos/audio**:`,
    `  → Use get_file_metadata to check duration, codecs, album, artist, genre.`,
    `  → A 2-second video is likely a GIF/clip; a 60-minute video is likely a recording/movie.`,
    ``,
    `- **If top files seem ambiguous** (many similar names, hard to distinguish):`,
    `  → Use read_file_preview with search_term to peek at content and differentiate.`,
    ``,
    `- **If query is simple/clear** (e.g. "日志" and you found files named *.log):`,
    `  → Skip verification, go straight to finish.`,
    ``,
    `### Phase 3: Finish`,
    `Call finish with ranked results. Scores should reflect content verification results.`,
    ``,
    `## FILE REFERENCING`,
    ``,
    `- search_files / list_recent_files return files with a numeric "file_id".`,
    `- In finish, reference files by file_id. Do NOT copy file paths.`,
    `- All tools accept file_id.`,
    ``,
    `## CRITICAL RULES`,
    ``,
    `- ONLY reference file_ids returned by search_files/list_recent_files. NEVER invent file_ids.`,
    `- NEVER hallucinate. match_reason must ONLY state verified facts (name, path, ext, date, or content/metadata you actually read).`,
    `- If you used grep_files or read_file_preview, you CAN mention content findings in match_reason.`,
    `- If you used get_file_metadata, you CAN mention metadata (title, camera, GPS, duration, screenshot type) in match_reason.`,
    `- If you used analyze_image, you CAN mention what the image shows in match_reason.`,
    `- For media files without any verification: score on type + date + path + name only.`,
    `- Use the SAME language as the user.`,
    `- Maximum 10 files in finish.`,
    `- Keep total tool calls under 6 for speed. Don't over-verify.`,
    `- If nothing found after trying, call finish with empty file_ids and explain what you tried.`,
  ];

  return lines.join("\n");
}

/**
 * Run the agent loop. The LLM autonomously decides which tools to call and when to stop.
 *
 * @param userQuery - The user's natural language file description
 * @param onStep - Callback for each step (for live UI updates)
 * @param signal - Optional AbortSignal to cancel the agent loop
 * @returns AgentResult with ranked files, summary, and questions
 */
export async function runAgent(
  userQuery: string,
  onStep: OnStepCallback,
  signal?: AbortSignal,
): Promise<AgentResult> {
  // Reset state for this new agent run
  resetFileRegistry();
  resetFunctionCallingState();

  // Pre-analyze user query for guardrails
  const userMentionedTime = queryMentionsTime(userQuery);

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: userQuery },
  ];

  let agentResult: AgentResult | null = null;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Check if cancelled before each iteration
    if (signal?.aborted) {
      onStep({
        type: "error",
        content: "Search cancelled by user.",
      });
      break;
    }

    let response;
    try {
      // Call LLM with tools
      response = await chatCompletion({
        messages,
        tools: TOOL_DEFINITIONS,
        maxTokens: 4000,
        signal,
      });
    } catch (error) {
      // If aborted, break out of the loop gracefully (partial results will be returned)
      if (signal?.aborted) {
        onStep({
          type: "error",
          content: "Search cancelled by user.",
        });
        break;
      }
      throw error; // Re-throw non-abort errors
    }

    // If LLM returned text content (thinking), emit it
    if (response.content) {
      onStep({
        type: "thinking",
        content: response.content,
      });

      // Add assistant message to conversation
      messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls ?? undefined,
      });
    } else if (response.toolCalls) {
      // No text content, but has tool calls - add the message
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: response.toolCalls,
      });
    }

    // If no tool calls, the agent is done thinking (shouldn't happen often with tools)
    if (!response.toolCalls || response.toolCalls.length === 0) {
      // LLM finished without calling finish - create a default result
      if (!agentResult) {
        agentResult = {
          files: [],
          summary: response.content || "Agent did not produce results.",
          clarifyingQuestions: [],
        };
      }
      break;
    }

    // Execute each tool call
    for (const toolCall of response.toolCalls) {
      // Check if cancelled before each tool execution
      if (signal?.aborted) break;

      const toolName = toolCall.function.name;
      let toolArgsStr = toolCall.function.arguments;

      let toolArgs: Record<string, unknown> = {};
      try {
        toolArgs = JSON.parse(toolArgsStr);
      } catch {
        toolArgs = {};
      }

      // Guardrail: strip date params from search_files if user never mentioned time
      if (toolName === "search_files" && !userMentionedTime) {
        if (toolArgs.date_after || toolArgs.date_before) {
          console.log(
            `Guardrail: stripping hallucinated date params (user query: "${userQuery}")`,
          );
          delete toolArgs.date_after;
          delete toolArgs.date_before;
          toolArgsStr = JSON.stringify(toolArgs);
        }
      }

      // Emit tool_call step
      onStep({
        type: "tool_call",
        content: formatToolCallDescription(toolName, toolArgs),
        toolName,
        toolArgs,
      });

      // Execute the tool
      try {
        const { result, agentResult: finishResult } = await executeTool(
          toolName,
          toolArgsStr,
        );

        // Emit tool_result step
        const resultSummary = summarizeToolResult(toolName, result);
        onStep({
          type: "tool_result",
          content: resultSummary,
          toolName,
        });

        // Add tool result to conversation
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });

        // If this was finish, capture the result
        if (toolName === "finish" && finishResult) {
          agentResult = finishResult;
        }
      } catch (error) {
        // If aborted during tool execution, break gracefully
        if (signal?.aborted) break;

        const errorMsg =
          error instanceof Error ? error.message : "Tool execution failed";

        onStep({
          type: "error",
          content: `Tool ${toolName} failed: ${errorMsg}`,
          toolName,
        });

        messages.push({
          role: "tool",
          content: JSON.stringify({ error: errorMsg }),
          tool_call_id: toolCall.id,
        });
      }
    }

    // If finish was called, we're done
    if (agentResult) {
      break;
    }
  }

  // If we exhausted iterations or were cancelled without a result, create a default
  if (!agentResult) {
    const wasCancelled = signal?.aborted;

    if (!wasCancelled) {
      onStep({
        type: "error",
        content: "Agent reached maximum iterations without finishing.",
      });
    }

    // Try to return partial results from the file registry
    const partialFiles = getRegisteredFiles();
    const hasPartial = partialFiles.length > 0;

    agentResult = {
      files: hasPartial
        ? partialFiles.slice(0, 10).map((f, i) => ({
            ...f,
            relevanceScore: 50,
            matchReason: wasCancelled
              ? "Search was stopped before verification."
              : "Agent timed out before ranking.",
            rank: i + 1,
          }))
        : [],
      summary: wasCancelled
        ? hasPartial
          ? `Search stopped. Found ${partialFiles.length} files before cancellation (unranked).`
          : "Search stopped before finding results."
        : "Search timed out after maximum iterations.",
      clarifyingQuestions: wasCancelled
        ? []
        : ["Could you provide more specific details about the file?"],
    };
  }

  // Emit final answer step
  onStep({
    type: "answer",
    content: agentResult.summary,
  });

  return agentResult;
}

// ─── Helper Functions ────────────────────────────────────────

/**
 * Format a tool call into a human-readable description for the UI.
 */
function formatToolCallDescription(
  toolName: string,
  args: Record<string, unknown>,
): string {
  switch (toolName) {
    case "search_files": {
      const parts: string[] = [];
      if (args.keywords)
        parts.push(`keywords: ${(args.keywords as string[]).join(", ")}`);
      if (args.directory)
        parts.push(`in: ${shortenPath(args.directory as string)}`);
      if (args.file_types)
        parts.push(`types: ${(args.file_types as string[]).join(", ")}`);
      if (args.date_after) parts.push(`after: ${args.date_after}`);
      if (args.name_pattern) parts.push(`name: *${args.name_pattern}*`);
      return `Searching files (${parts.join(", ")})`;
    }
    case "find_directories":
      return `Finding directories: "${args.name}"`;
    case "read_file_preview": {
      const target =
        args.file_id !== undefined
          ? `file #${args.file_id}`
          : shortenPath((args.path as string) || "unknown");
      const extra = args.search_term
        ? ` (searching: "${args.search_term}")`
        : "";
      return `Reading: ${target}${extra}`;
    }
    case "grep_files": {
      const ids = (args.file_ids as number[]) || [];
      const scope =
        ids.length > 0
          ? `${ids.length} files`
          : shortenPath((args.path as string) || "");
      return `Searching content: "${args.pattern}" in ${scope}`;
    }
    case "get_file_metadata": {
      const target =
        args.file_id !== undefined
          ? `file #${args.file_id}`
          : shortenPath((args.path as string) || "unknown");
      return `Reading metadata: ${target}`;
    }
    case "analyze_image": {
      const q = ((args.question as string) || "").slice(0, 50);
      return `🔍 Analyzing image #${args.file_id}: "${q}..."`;
    }
    case "list_recent_files": {
      const hours = (args.hours as number) || 24;
      const types = args.file_types
        ? ` (${(args.file_types as string[]).join(", ")})`
        : "";
      return `Listing recent files (last ${hours}h${types})`;
    }
    case "finish": {
      const fileIds = (args as { file_ids?: unknown[] }).file_ids ?? [];
      return `Presenting ${fileIds.length} results`;
    }
    default:
      return `Calling ${toolName}`;
  }
}

/**
 * Summarize a tool result for display in the UI.
 */
function summarizeToolResult(toolName: string, resultJson: string): string {
  try {
    const result = JSON.parse(resultJson);

    switch (toolName) {
      case "search_files": {
        if (result.count === 0) return "No files found";
        const files =
          (result.files as { file_id: number; name: string }[]) || [];
        const fileNames = files
          .slice(0, 8)
          .map((f) => f.name)
          .join(", ");
        const more = files.length > 8 ? ` ... +${files.length - 8} more` : "";
        return `Found ${result.count} files:\n${fileNames}${more}`;
      }
      case "find_directories":
        if (result.count === 0) return "No directories found";
        return `Found ${result.count} directories: ${(result.directories as string[]).slice(0, 3).map(shortenPath).join(", ")}`;
      case "read_file_preview": {
        if (result.error) return `Error: ${result.error}`;
        if (result.search_term) {
          return result.found
            ? `Found "${result.search_term}" (${result.match_count} matches in ${result.total_lines} lines)`
            : `"${result.search_term}" not found in file`;
        }
        return `Read ${result.lines_shown} lines (${result.total_lines} total)`;
      }
      case "grep_files": {
        if (result.total_matches === 0)
          return `"${result.pattern}" not found in any file`;
        return `"${result.pattern}" found in ${result.files_with_matches}/${result.total_files_searched} files (${result.total_matches} matches)`;
      }
      case "get_file_metadata": {
        if (result.error) return `Error: ${result.error}`;
        const summary = result.summary;
        return summary
          ? summary.slice(0, 120)
          : `${result.metadata_count} metadata fields`;
      }
      case "analyze_image": {
        if (result.error) return `Error: ${result.error}`;
        const desc = (result.description as string) || "";
        return `Image: ${desc.slice(0, 120)}${desc.length > 120 ? "..." : ""}`;
      }
      case "list_recent_files": {
        if (result.count === 0)
          return `No recent files (last ${result.hours}h)`;
        const files =
          (result.files as { file_id: number; name: string }[]) || [];
        const fileNames = files
          .slice(0, 5)
          .map((f) => f.name)
          .join(", ");
        const more = files.length > 5 ? ` ... +${files.length - 5} more` : "";
        return `${result.count} recent files:\n${fileNames}${more}`;
      }
      case "finish":
        return `Done: ${result.files_count} files`;
      default:
        return "Done";
    }
  } catch {
    return "Done";
  }
}

function shortenPath(path: string): string {
  const home = process.env.HOME || "";
  if (path.startsWith(home)) return "~" + path.slice(home.length);
  return path;
}
