/**
 * ReAct Agent Loop: The LLM autonomously reasons, calls tools, observes results,
 * and iterates until it has found the files the user is looking for.
 */

import { ChatMessage, AgentStep, AgentResult, AgentEvent } from "./types";
import {
  chatCompletion,
  streamChatCompletion,
  resetFunctionCallingState,
} from "./llm";
import {
  TOOL_DEFINITIONS,
  executeTool,
  resetFileRegistry,
  getRegisteredFiles,
} from "./tools";
import { ToolDefinition } from "./types";

const MAX_ITERATIONS = 12;
const NUDGE_SOFT_THRESHOLD = 4; // After 4 tool calls: gentle nudge
const NUDGE_HARD_THRESHOLD = 8; // After 8 tool calls: hard deadline

/** Image extensions used for dynamic tool filtering (show analyze_image only when relevant) */
const IMAGE_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "tif",
  "heic",
  "heif",
  "svg",
]);

export type OnStepCallback = (step: AgentStep) => void;

export interface AgentLoopHooks {
  /**
   * "Steering" messages are user interruptions that should be injected mid-run.
   * If any arrive, the agent should stop executing remaining tool calls for the
   * current assistant message, and continue with a new turn using the new clue(s).
   */
  getSteeringMessages?: () => Promise<string[]> | string[];
  /**
   * Follow-up messages are processed after the agent would otherwise stop.
   * Useful for queued refinements that should run after the current turn finishes.
   */
  getFollowUpMessages?: () => Promise<string[]> | string[];
  /**
   * Fine-grained event stream (pi-mono style).
   * If provided, `runAgent` emits assistant message and tool execution lifecycle events.
   */
  onEvent?: (event: AgentEvent) => void;
}

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
    `You have 9 tools. Use them strategically:`,
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
    `| scan_directory | Scan file contents (first N bytes) by regex pattern | When user describes content characteristics and search_files found nothing |`,
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
    `6. If there are MANY candidates, use pagination: call search_files with offset/limit to fetch more pages (use next_offset from the tool result).`,
    ``,
    `### Phase 1b: Content Pattern Scan (when search_files fails)`,
    `If search_files returns no useful results AND the user is describing`,
    `content characteristics (not a filename), use scan_directory:`,
    ``,
    `**When to use scan_directory:**`,
    `- User describes WHAT IS INSIDE the file, not the file name`,
    `- search_files (mdfind) found nothing or only irrelevant results`,
    `- The file may have a generic name (e.g. test.json, data.txt)`,
    ``,
    `**Content pattern examples (user clue → content_pattern):**`,
    `- "base64 编码的数据" → "[A-Za-z0-9+/=]{100,}"`,
    `- "有 SQL 语句的文件" → "SELECT|INSERT|UPDATE|CREATE TABLE"`,
    `- "包含 IP 地址的日志" → "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}"`,
    `- "有 JSON 数组的文件" → "^\\[\\{|\\":\\s*\\["`,
    `- "有密钥/token的文件" → "(sk-|AKIA|ghp_|Bearer )[A-Za-z0-9]+"`,
    ``,
    `scan_directory reads actual file content (first N bytes) — no Spotlight index needed.`,
    `Default scans ~/Documents, ~/Downloads, ~/Desktop. Can target a specific directory.`,
    `Also try grep_files with include_all=true and extended regex for deeper content search.`,
    ``,
    `### Phase 2: Content Verification (important for accuracy!)`,
    `After search_files returns results, VERIFY top candidates before finishing:`,
    ``,
    `- **If user described file by content** (e.g. "包含XX的文件", "记录了XX的文档"):`,
    `  → Use grep_files to check which files actually contain the described content.`,
    `  → Boost scores for files with matching content.`,
    ``,
    `- **If results include documents (XMind/DOCX/XLSX/PPTX/Pages/Numbers)**:`,
    `  → Use read_file_preview or grep_files to verify content — these tools can extract text from binary formats.`,
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

// ─── Session Management ──────────────────────────────────────

/**
 * Represents an agent session that can persist across multi-turn interactions.
 * When the user refines a search (e.g., adds clues), we keep the existing
 * messages and file registry instead of starting from scratch.
 */
export interface AgentSession {
  /** Conversation history from the previous run */
  messages: ChatMessage[];
  /** Whether this is a continuation (multi-turn) */
  isContinuation: boolean;
}

/**
 * Create an empty session (for first query).
 */
export function createEmptySession(): AgentSession {
  return { messages: [], isContinuation: false };
}

/**
 * Run the agent loop. The LLM autonomously decides which tools to call and when to stop.
 *
 * @param userQuery - The user's natural language file description
 * @param onStep - Callback for each step (for live UI updates)
 * @param signal - Optional AbortSignal to cancel the agent loop
 * @param previousSession - Optional previous session for multi-turn refinement
 * @returns AgentResult with ranked files, summary, questions, and the session for continuation
 */
export async function runAgent(
  userQuery: string,
  onStep: OnStepCallback,
  signal?: AbortSignal,
  previousSession?: AgentSession,
  hooks?: AgentLoopHooks,
): Promise<AgentResult & { session: AgentSession }> {
  const isMultiTurn = previousSession?.isContinuation ?? false;

  if (!isMultiTurn) {
    // Fresh search: reset everything
    resetFileRegistry();
  }
  resetFunctionCallingState();

  // Pre-analyze user query for guardrails
  let userMentionedTime = queryMentionsTime(userQuery);

  // Initialize messages (assigned below). Declared early so helper closures can reference it.
  let messages: ChatMessage[] = [];

  const emitEvent = (event: AgentEvent): void => {
    try {
      hooks?.onEvent?.(event);
    } catch {
      // UI events should never break the agent loop
    }
  };

  const readSteering = async (): Promise<string[]> => {
    const raw = hooks?.getSteeringMessages?.();
    const msgs = raw instanceof Promise ? await raw : raw;
    return (msgs || []).map((m) => (m || "").trim()).filter(Boolean);
  };

  const readFollowUps = async (): Promise<string[]> => {
    const raw = hooks?.getFollowUpMessages?.();
    const msgs = raw instanceof Promise ? await raw : raw;
    return (msgs || []).map((m) => (m || "").trim()).filter(Boolean);
  };

  const injectSteeringMessages = async (): Promise<void> => {
    const steering = await readSteering();
    if (steering.length === 0) return;

    // Update guardrail state: steering may mention time.
    if (!userMentionedTime) {
      userMentionedTime = queryMentionsTime(steering.join(" "));
    }

    onStep({
      type: "thinking",
      content:
        steering.length === 1
          ? `Received new clue: "${steering[0]}". Re-planning...`
          : `Received ${steering.length} new clues. Re-planning...`,
    });

    for (const clue of steering) {
      messages.push({
        role: "user",
        content:
          `[Steering clue]: ${clue}\n\nThe user provided a new clue while you were working. ` +
          `Incorporate it immediately. If you already found candidate files, reuse their file_ids and verify/rerank.`,
      });
    }
  };

  // ─── Initialize messages ──────────────────────────────────
  if (isMultiTurn && previousSession && previousSession.messages.length > 0) {
    // Multi-turn: keep previous conversation and append new user message
    messages = [
      ...previousSession.messages,
      {
        role: "user",
        content: `[Follow-up clue]: ${userQuery}\n\nThe user has provided additional information. Use the files already found in previous searches plus this new clue to refine results. Call finish with the best matches.`,
      },
    ];
    onStep({
      type: "thinking",
      content: "Refining search with new clues from previous context...",
    });
  } else {
    // Fresh search: start from scratch
    messages = [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userQuery },
    ];

    // ─── Planning Phase ──────────────────────────────────────
    // Ask the LLM to make a brief plan before tool execution.
    // This focuses the agent and reduces "wandering" search behavior.
    try {
      if (!signal?.aborted) {
        onStep({ type: "thinking", content: "Planning search strategy..." });

        const planResponse = await chatCompletion({
          messages: [
            ...messages,
            {
              role: "system",
              content:
                `Before searching, briefly plan your approach in 1-3 steps. ` +
                `Analyze the user's query: what keywords to search, what file type is likely, ` +
                `and whether content verification is needed. ` +
                `Be concise (2-4 sentences). Then proceed to execute.`,
            },
          ],
          maxTokens: 300,
          temperature: 0.2,
          signal,
        });

        if (planResponse.content) {
          onStep({ type: "thinking", content: planResponse.content });
          // Inject plan as assistant message so the LLM follows its own plan
          messages.push({
            role: "assistant",
            content: planResponse.content,
          });
        }
      }
    } catch {
      // Planning is optional — if it fails (abort, API error), just skip it
      console.log("Planning phase skipped due to error.");
    }
  }

  let agentResult: AgentResult | null = null;
  let totalToolCalls = 0;

  emitEvent({ type: "agent_start" });

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Check if cancelled before each iteration
    if (signal?.aborted) {
      onStep({
        type: "error",
        content: "Search cancelled by user.",
      });
      break;
    }

    emitEvent({ type: "turn_start", iteration });
    let turnEnded = false;
    const endTurn = () => {
      if (turnEnded) return;
      turnEnded = true;
      emitEvent({ type: "turn_end", iteration });
    };

    // Steering: inject any queued user clues before calling the LLM.
    await injectSteeringMessages();

    let response;
    let assistantStreamId: string | null = null;
    let assistantStreamContent = "";
    try {
      // Compress old tool results to save context tokens
      let compressedMessages = compressMessages(messages);

      // Token overflow protection: aggressive compression if approaching limit
      const estimatedTokens = estimateTokens(compressedMessages);
      if (estimatedTokens > TOKEN_SAFETY_LIMIT) {
        console.log(
          `Token overflow protection: ~${estimatedTokens} tokens, applying aggressive compression`,
        );
        compressedMessages = aggressiveCompress(messages);
      }

      // Dynamic temperature: lower as we get deeper into iterations (more deterministic)
      const dynamicTemp =
        totalToolCalls >= NUDGE_HARD_THRESHOLD
          ? 0.1
          : totalToolCalls >= NUDGE_SOFT_THRESHOLD
            ? 0.2
            : 0.3;

      // Dynamic max tokens: lower in later phases (shorter, more focused responses)
      const dynamicMaxTokens =
        totalToolCalls >= NUDGE_SOFT_THRESHOLD ? 2000 : 4000;

      // Dynamic tool filtering: only show tools relevant to current phase
      const registeredFiles = getRegisteredFiles();
      const hasFiles = registeredFiles.length > 0;
      const hasImages = registeredFiles.some((f) =>
        IMAGE_EXTS.has(f.extension.toLowerCase()),
      );
      const availableTools = getAvailableTools(hasFiles, hasImages);

      // Call LLM with filtered tools (streaming for real-time feedback)
      // Streaming reduces time-to-first-token but we DON'T emit fragments
      // as separate thinking steps — that causes UI fragmentation.
      // Instead, we show a single progress indicator during streaming,
      // and emit the full thinking text once streaming completes.
      let streamedPlaceholderShown = false;
      response = await streamChatCompletion({
        messages: compressedMessages,
        tools: availableTools,
        temperature: dynamicTemp,
        maxTokens: dynamicMaxTokens,
        signal,
        onPartialContent: (delta) => {
          if (!delta) return;

          // If UI provided an event handler, stream content updates to it.
          if (hooks?.onEvent) {
            if (!assistantStreamId) {
              assistantStreamId = `assistant_${Date.now()}_${iteration}`;
              emitEvent({
                type: "assistant_message_start",
                messageId: assistantStreamId,
                kind: "thinking",
              });
            }
            assistantStreamContent += delta;
            emitEvent({
              type: "assistant_message_update",
              messageId: assistantStreamId,
              delta,
              content: assistantStreamContent,
            });
            return;
          }

          // Fallback: show a single progress indicator (avoid UI fragmentation).
          if (!streamedPlaceholderShown) {
            streamedPlaceholderShown = true;
            onStep({ type: "thinking", content: "Analyzing..." });
          }
        },
      });
    } catch (error) {
      // If aborted, break out of the loop gracefully (partial results will be returned)
      if (signal?.aborted) {
        onStep({
          type: "error",
          content: "Search cancelled by user.",
        });
        endTurn();
        break;
      }
      throw error; // Re-throw non-abort errors
    }

    // If LLM returned text content (thinking), emit it
    if (response.content) {
      // Close out the streaming lifecycle (if any).
      if (hooks?.onEvent && assistantStreamId) {
        emitEvent({
          type: "assistant_message_end",
          messageId: assistantStreamId,
          content: response.content,
        });
      }

      // If a UI event stream is present, prefer it over step-based thinking to avoid duplication.
      if (!hooks?.onEvent) {
        onStep({
          type: "thinking",
          content: response.content,
        });
      } else if (!assistantStreamId) {
        // Non-streaming providers: emit a single assistant message lifecycle.
        const messageId = `assistant_${Date.now()}_${iteration}`;
        emitEvent({
          type: "assistant_message_start",
          messageId,
          kind: "thinking",
        });
        emitEvent({
          type: "assistant_message_update",
          messageId,
          delta: response.content,
          content: response.content,
        });
        emitEvent({
          type: "assistant_message_end",
          messageId,
          content: response.content,
        });
      }

      // Add assistant message to conversation
      messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls ?? undefined,
      });
    } else if (response.toolCalls) {
      // If we streamed text but ended up with tool calls and no final content,
      // still close out the assistant message lifecycle.
      if (hooks?.onEvent && assistantStreamId) {
        emitEvent({
          type: "assistant_message_end",
          messageId: assistantStreamId,
          content: assistantStreamContent,
        });
      }

      // No text content, but has tool calls - add the message
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: response.toolCalls,
      });
    }

    // If no tool calls, the agent is done thinking (shouldn't happen often with tools)
    if (!response.toolCalls || response.toolCalls.length === 0) {
      // Follow-ups: if user queued messages after we would stop, keep going.
      const followUps = await readFollowUps();
      if (followUps.length > 0) {
        if (!userMentionedTime) {
          userMentionedTime = queryMentionsTime(followUps.join(" "));
        }
        for (const clue of followUps) {
          messages.push({
            role: "user",
            content:
              `[Follow-up clue]: ${clue}\n\nThe user provided additional information. ` +
              `Use your previous tool results and file_ids to refine and finish.`,
          });
        }
        endTurn();
        // Continue with another iteration/turn instead of stopping.
        continue;
      }

      // LLM finished without calling finish - create a default result
      if (!agentResult) {
        agentResult = {
          files: [],
          summary: response.content || "Agent did not produce results.",
          clarifyingQuestions: [],
        };
      }
      endTurn();
      break;
    }

    // ─── Pre-process tool calls (guardrails) ────────────────
    const preparedCalls = response.toolCalls.map((toolCall) => {
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

      return { toolCall, toolName, toolArgsStr, toolArgs };
    });

    // Emit all tool_call steps upfront
    for (const { toolName, toolArgs } of preparedCalls) {
      onStep({
        type: "tool_call",
        content: formatToolCallDescription(toolName, toolArgs),
        toolName,
        toolArgs,
      });
    }

    // ─── Execute tools sequentially (steerable) ───────────────
    if (signal?.aborted) {
      endTurn();
      break;
    }

    let steeringTriggered = false;

    for (let i = 0; i < preparedCalls.length; i++) {
      const { toolCall, toolName } = preparedCalls[i];
      let { toolArgsStr, toolArgs } = preparedCalls[i];

      if (signal?.aborted) break;

      // Guardrail: don't allow finish with invented file_ids.
      // If the registry is empty or none of the provided ids exist, treat as a tool error
      // and continue the loop so the model is forced to search first.
      if (toolName === "finish") {
        const registrySize = getRegisteredFiles().length;
        const finishArgs = toolArgs as {
          file_ids?: unknown;
          summary?: unknown;
          clarifying_questions?: unknown;
        };

        const provided = Array.isArray(finishArgs.file_ids)
          ? (finishArgs.file_ids as unknown[]).filter(
              (e): e is Record<string, unknown> =>
                !!e && typeof e === "object" && !Array.isArray(e),
            )
          : [];
        const validEntries = provided
          .filter((e) => typeof e?.file_id === "number")
          .filter(
            (e) =>
              (e.file_id as number) >= 0 &&
              (e.file_id as number) < registrySize,
          )
          .slice(0, 10);

        if (validEntries.length === 0 && provided.length > 0) {
          const errorMsg =
            registrySize === 0
              ? "finish called before any files were found (empty registry)."
              : "finish referenced only invalid file_ids (not in registry).";

          emitEvent({
            type: "tool_execution_start",
            toolCallId: toolCall.id,
            toolName,
            args: toolArgs,
          });

          onStep({
            type: "error",
            content: `Tool finish failed: ${errorMsg}`,
            toolName,
          });

          messages.push({
            role: "tool",
            content: JSON.stringify({ error: errorMsg }),
            tool_call_id: toolCall.id,
          });

          emitEvent({
            type: "tool_execution_end",
            toolCallId: toolCall.id,
            toolName,
            isError: true,
            result: JSON.stringify({ error: errorMsg }),
          });

          messages.push({
            role: "system",
            content:
              `Your finish call was invalid: ${errorMsg} ` +
              `You MUST only reference file_ids returned by search_files/list_recent_files/scan_directory. ` +
              `Call search_files first, then call finish with valid file_ids.`,
          });

          // Stop executing other tool calls from this assistant message.
          break;
        }

        // If there are some valid entries, replace args so executeFinish can't drop them all.
        if (
          validEntries.length > 0 &&
          validEntries.length !== provided.length
        ) {
          const summary =
            typeof finishArgs.summary === "string" ? finishArgs.summary : "";
          const clarifying_questions = Array.isArray(
            finishArgs.clarifying_questions,
          )
            ? finishArgs.clarifying_questions
            : undefined;
          const fixedArgs = {
            file_ids: validEntries,
            summary,
            ...(clarifying_questions ? { clarifying_questions } : {}),
          };
          const fixedArgsStr = JSON.stringify(fixedArgs);
          preparedCalls[i] = {
            ...preparedCalls[i],
            toolArgs: fixedArgs as Record<string, unknown>,
            toolArgsStr: fixedArgsStr,
          };
          toolArgs = fixedArgs as Record<string, unknown>;
          toolArgsStr = fixedArgsStr;
        }
      }

      emitEvent({
        type: "tool_execution_start",
        toolCallId: toolCall.id,
        toolName,
        args: toolArgs,
      });

      try {
        const { result, agentResult: finishResult } = await executeTool(
          toolName,
          toolArgsStr,
        );

        const resultSummary = summarizeToolResult(toolName, result);
        onStep({ type: "tool_result", content: resultSummary, toolName });

        messages.push({
          role: "tool",
          content: truncateToolResultForLLM(toolName, result),
          tool_call_id: toolCall.id,
        });

        emitEvent({
          type: "tool_execution_end",
          toolCallId: toolCall.id,
          toolName,
          isError: false,
          result,
        });

        if (toolName === "finish" && finishResult) {
          agentResult = validateFinishResult(finishResult);
        }
      } catch (e) {
        if (signal?.aborted) break;

        const errorMsg =
          e instanceof Error ? e.message : "Tool execution failed";
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

        emitEvent({
          type: "tool_execution_end",
          toolCallId: toolCall.id,
          toolName,
          isError: true,
          result: JSON.stringify({ error: errorMsg }),
        });

        messages.push({
          role: "system",
          content:
            `Tool "${toolName}" failed with: ${errorMsg}. ` +
            `Analyze the error and try a different approach. Do NOT retry with the same parameters.`,
        });
      }

      // If this turn produced a final result, stop early.
      if (agentResult) break;

      // Check steering after each tool execution.
      const steering = await readSteering();
      if (steering.length > 0) {
        steeringTriggered = true;

        onStep({
          type: "thinking",
          content:
            "New clue received while executing tools. Skipping remaining tool calls and continuing...",
        });

        // IMPORTANT: some providers require a tool result for EVERY tool call
        // before the next assistant message. So we emit "skipped" tool results
        // for the remaining calls to keep the protocol consistent.
        for (let j = i + 1; j < preparedCalls.length; j++) {
          const skipped = preparedCalls[j];
          messages.push({
            role: "tool",
            content: JSON.stringify({
              skipped: true,
              reason: "Skipped due to queued user message.",
            }),
            tool_call_id: skipped.toolCall.id,
          });
          emitEvent({
            type: "tool_execution_end",
            toolCallId: skipped.toolCall.id,
            toolName: skipped.toolName,
            isError: true,
            skipped: true,
            result: JSON.stringify({
              skipped: true,
              reason: "Skipped due to queued user message.",
            }),
          });
        }

        // Update guardrails based on steering content, then inject as user messages.
        if (!userMentionedTime) {
          userMentionedTime = queryMentionsTime(steering.join(" "));
        }

        for (const clue of steering) {
          messages.push({
            role: "user",
            content:
              `[Steering clue]: ${clue}\n\nThe user provided a new clue while you were working. ` +
              `Incorporate it immediately. If you already found candidate files, reuse their file_ids and verify/rerank.`,
          });
        }

        break;
      }
    }

    // Track total tool calls for convergence nudging
    totalToolCalls += response.toolCalls.length;

    // If finish was called, we're done
    if (agentResult) {
      endTurn();
      break;
    }

    // If we injected steering, continue with the next assistant turn immediately.
    if (steeringTriggered) {
      endTurn();
      continue;
    }

    // ─── Convergence Nudge ──────────────────────────────────
    // Inject system messages to push the LLM toward finishing.
    if (totalToolCalls >= NUDGE_HARD_THRESHOLD) {
      messages.push({
        role: "system",
        content:
          `You have made ${totalToolCalls} tool calls. This is your LAST chance. ` +
          `You MUST call finish now with your best matches (even if imperfect). Do NOT search again.`,
      });
    } else if (totalToolCalls >= NUDGE_SOFT_THRESHOLD) {
      messages.push({
        role: "system",
        content:
          `You have made ${totalToolCalls} tool calls. Please start wrapping up — ` +
          `call finish with your best matches so far, or call finish with empty results and explain what you tried.`,
      });
    }

    endTurn();
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

  // Return result with session for potential multi-turn continuation
  emitEvent({ type: "agent_end" });
  return {
    ...agentResult,
    session: {
      messages: messages,
      isContinuation: true,
    },
  };
}

// ─── Dynamic Tool Filtering ──────────────────────────────────

/**
 * Search-phase tools: initial file discovery.
 */
const SEARCH_TOOLS = new Set([
  "search_files",
  "find_directories",
  "list_recent_files",
  "scan_directory",
  "finish",
]);

/**
 * Verification tools: need files in the registry first.
 */
const VERIFY_TOOLS = new Set([
  "read_file_preview",
  "grep_files",
  "get_file_metadata",
]);

/**
 * Filter available tools based on the current agent state.
 * - Before any files are found: only search tools
 * - After files are found: add verification tools
 * - If image files exist in results: add analyze_image
 *
 * This reduces tool definition tokens by ~40% in early iterations
 * and prevents the LLM from calling irrelevant tools.
 */
function getAvailableTools(
  hasFiles: boolean,
  hasImages: boolean,
): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter((t) => {
    const name = t.function.name;

    // Always available
    if (SEARCH_TOOLS.has(name)) return true;

    // Verification tools: only after we have files
    if (VERIFY_TOOLS.has(name)) return hasFiles;

    // analyze_image: only when images exist in results
    if (name === "analyze_image") return hasFiles && hasImages;

    return true;
  });
}

// ─── Token Estimation & Overflow Protection ──────────────────

/**
 * Rough token estimate for a message array.
 * Uses ~4 chars per token heuristic (good enough for overflow detection).
 */
function estimateTokens(messages: ChatMessage[]): number {
  let chars = 0;
  for (const msg of messages) {
    chars += (msg.content || "").length;
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        chars += tc.function.name.length + tc.function.arguments.length;
      }
    }
  }
  return Math.ceil(chars / 4);
}

/**
 * Maximum estimated tokens before aggressive compression kicks in.
 * Most models support 8K-128K, so 10K is a conservative safety threshold.
 */
const TOKEN_SAFETY_LIMIT = 10000;

/**
 * Aggressively compress messages when approaching token limit.
 * Keeps only system, user, and the last 2 tool result pairs.
 */
function aggressiveCompress(messages: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  const toolResults: number[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    // Always keep system and user messages
    if (msg.role === "system" || msg.role === "user") {
      result.push(msg);
    } else {
      toolResults.push(i);
    }
  }

  // Keep only the last 4 non-system/user messages (roughly 2 tool call + result pairs)
  const recentIndices = new Set(toolResults.slice(-4));
  for (const idx of toolResults) {
    if (recentIndices.has(idx)) {
      result.push(messages[idx]);
    } else {
      // Ultra-brief for old messages
      const msg = messages[idx];
      if (msg.role === "tool") {
        result.push({ ...msg, content: '{"summary":"(compressed)"}' });
      } else {
        result.push({
          ...msg,
          content: msg.content ? msg.content.slice(0, 100) : "",
        });
      }
    }
  }

  return result;
}

// ─── Context Compression ─────────────────────────────────────

/**
 * Number of recent tool-result messages to keep in full.
 * Older tool results are compressed to one-line summaries.
 */
const KEEP_RECENT_TOOL_RESULTS = 4;

/**
 * Compress old tool results in the message history to save context tokens.
 * - System + user messages: always kept intact
 * - Recent N tool result messages: kept in full
 * - Older tool result messages: replaced with a one-line summary
 * - Assistant messages: always kept (they contain tool_calls references)
 */
function compressMessages(messages: ChatMessage[]): ChatMessage[] {
  // Find indices of all tool-result messages
  const toolResultIndices: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "tool") {
      toolResultIndices.push(i);
    }
  }

  // If we have few tool results, no compression needed
  if (toolResultIndices.length <= KEEP_RECENT_TOOL_RESULTS) {
    return messages;
  }

  // Indices of old tool results that should be compressed
  const oldIndices = new Set(
    toolResultIndices.slice(0, -KEEP_RECENT_TOOL_RESULTS),
  );

  return messages.map((msg, i) => {
    if (!oldIndices.has(i)) return msg;

    // Compress old tool result to a short summary
    const summary = summarizeToolResultBrief(msg.content || "");
    return {
      ...msg,
      content: summary,
    };
  });
}

/**
 * Create a very brief summary of a tool result (for compressed context).
 */
function summarizeToolResultBrief(resultJson: string): string {
  try {
    const r = JSON.parse(resultJson);

    if (r.error) return JSON.stringify({ summary: `Error: ${r.error}` });
    if (r.already_searched)
      return JSON.stringify({ summary: "Redundant search skipped." });
    if (r.count !== undefined && r.files) {
      const names = r.files
        .slice(0, 5)
        .map((f: { name: string }) => f.name)
        .join(", ");
      return JSON.stringify({
        summary: `Found ${r.count} files: ${names}${r.count > 5 ? "..." : ""}`,
      });
    }
    if (r.count !== undefined && r.directories) {
      return JSON.stringify({
        summary: `Found ${r.count} directories.`,
      });
    }
    if (r.pattern !== undefined) {
      return JSON.stringify({
        summary: `grep "${r.pattern}": ${r.total_matches || 0} matches in ${r.files_with_matches || 0} files.`,
      });
    }
    if (r.preview !== undefined) {
      return JSON.stringify({
        summary: r.search_term
          ? `File search for "${r.search_term}": ${r.found ? `${r.match_count} matches` : "not found"}.`
          : `Read ${r.lines_shown || 0} lines.`,
      });
    }
    if (r.summary) {
      return JSON.stringify({
        summary: (r.summary as string).slice(0, 100),
      });
    }
    if (r.description) {
      return JSON.stringify({
        summary: `Image: ${(r.description as string).slice(0, 100)}`,
      });
    }
    // Fallback: just stringify keys
    return JSON.stringify({
      summary: `Result keys: ${Object.keys(r).join(", ")}`,
    });
  } catch {
    return JSON.stringify({ summary: "Tool completed." });
  }
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
      if (typeof args.offset === "number") parts.push(`offset: ${args.offset}`);
      if (typeof args.limit === "number") parts.push(`limit: ${args.limit}`);
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
 * Truncate a tool result before sending to the LLM context.
 * Keeps the most important information while reducing token usage.
 * This is the "Observation Filter" layer between raw tool output and the LLM.
 */
function truncateToolResultForLLM(
  toolName: string,
  resultJson: string,
): string {
  try {
    const result = JSON.parse(resultJson);

    switch (toolName) {
      case "search_files":
      case "list_recent_files": {
        // Cap at 10 files for LLM context (it doesn't need all 20)
        if (result.files && result.files.length > 10) {
          result.files = result.files.slice(0, 10);
          result.truncated = true;
          const total =
            typeof result.total_candidates === "number"
              ? result.total_candidates
              : typeof result.count === "number"
                ? result.count
                : result.files.length;
          const next =
            typeof result.next_offset === "number" ? result.next_offset : null;
          result.note =
            `Showing top 10 of ${total} candidates. Use these file_ids.` +
            (next !== null
              ? ` To fetch more, call search_files with offset=${next}.`
              : "");
        }
        return JSON.stringify(result);
      }

      case "grep_files": {
        // Limit matches per file to 3 for LLM context
        if (result.results) {
          for (const fileResult of result.results) {
            if (fileResult.matches && fileResult.matches.length > 3) {
              fileResult.matches = fileResult.matches.slice(0, 3);
              fileResult.truncated = true;
            }
          }
        }
        return JSON.stringify(result);
      }

      case "read_file_preview": {
        // Truncate preview to 2000 chars for LLM
        if (result.preview && result.preview.length > 2000) {
          result.preview =
            result.preview.slice(0, 2000) + "\n... (truncated for brevity)";
        }
        return JSON.stringify(result);
      }

      case "get_file_metadata": {
        // Keep summary but limit details to most useful keys
        if (result.details) {
          const importantKeys = new Set([
            "Title",
            "Authors",
            "Kind",
            "Pages",
            "Duration (sec)",
            "Camera Model",
            "Is Screenshot",
            "Screenshot Type",
            "Width (px)",
            "Height (px)",
            "Genre",
            "Album",
            "Codecs",
            "Description",
            "Downloaded From",
          ]);
          const filtered: Record<string, string> = {};
          for (const [k, v] of Object.entries(result.details)) {
            if (importantKeys.has(k)) {
              filtered[k] = v as string;
            }
          }
          result.details = filtered;
        }
        return JSON.stringify(result);
      }

      default:
        return resultJson;
    }
  } catch {
    return resultJson;
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

// ─── Finish Result Validation ────────────────────────────────

/**
 * Validate and clean up the finish result from the LLM.
 * - Filter out files with invalid file_ids (resolved to undefined by registry)
 * - Clamp scores to [0, 100]
 * - Warn if all scores are identical (likely hallucination)
 * - Ensure match_reason is not empty
 */
function validateFinishResult(result: AgentResult): AgentResult {
  // Filter: only files that actually exist (valid file_id resolution)
  const validFiles = result.files.filter((f) => f.path && f.name);

  // Clamp scores and fix empty reasons
  for (const f of validFiles) {
    f.relevanceScore = Math.max(0, Math.min(100, f.relevanceScore));
    if (!f.matchReason || f.matchReason.trim().length === 0) {
      f.matchReason = "Matched by agent search.";
    }
  }

  // Detect hallucinated uniform scores (e.g. all files scored exactly 85)
  if (validFiles.length > 2) {
    const scores = new Set(validFiles.map((f) => f.relevanceScore));
    if (scores.size === 1) {
      console.warn(
        `Finish validation: all ${validFiles.length} files have identical score ${[...scores][0]}, adjusting.`,
      );
      // Redistribute scores: first file keeps score, subsequent ones get gradually lower
      const baseScore = validFiles[0].relevanceScore;
      validFiles.forEach((f, i) => {
        f.relevanceScore = Math.max(10, baseScore - i * 5);
      });
    }
  }

  return {
    ...result,
    files: validFiles,
  };
}
