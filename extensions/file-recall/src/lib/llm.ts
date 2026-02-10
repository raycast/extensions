import { getPreferenceValues } from "@raycast/api";
import { ChatMessage, ChatResponse, ToolDefinition, ToolCall } from "./types";

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIChatCompletionResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string;
  }>;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

/**
 * Track whether function calling has ever failed for this session.
 * If so, always use fallback mode for the rest of the session.
 */
let functionCallingDisabled = false;

/**
 * Track whether streaming has ever failed for this session.
 * If so, avoid attempting SSE streaming again (some providers/models don't support it).
 */
let streamingDisabled = false;

/**
 * Reset function calling state. Call at the start of each agent run.
 */
export function resetFunctionCallingState(): void {
  functionCallingDisabled = false;
  streamingDisabled = false;
}

function injectToolPromptIntoSystemMessage(
  messages: ChatMessage[],
  tools: ToolDefinition[],
): ChatMessage[] {
  const toolPrompt = buildToolDescriptionPrompt(tools);
  return messages.map((msg, i) => {
    if (i === 0 && msg.role === "system") {
      return { ...msg, content: (msg.content || "") + "\n\n" + toolPrompt };
    }
    return msg;
  });
}

/**
 * Sanitize messages for the API request.
 * Strips tool-related fields when not using function calling.
 */
function sanitizeMessages(
  messages: ChatMessage[],
  withTools: boolean,
): Record<string, unknown>[] {
  return messages.map((msg) => {
    // In fallback mode, convert tool messages to user/assistant messages
    if (!withTools) {
      if (msg.role === "tool") {
        return { role: "user", content: `[Tool Result]: ${msg.content || ""}` };
      }
      if (
        msg.role === "assistant" &&
        msg.tool_calls &&
        msg.tool_calls.length > 0
      ) {
        // Convert tool calls to text
        const callsText = msg.tool_calls
          .map(
            (tc) =>
              `[Tool Call]: ${tc.function.name}(${tc.function.arguments})`,
          )
          .join("\n");
        return {
          role: "assistant",
          content: (msg.content || "") + "\n" + callsText,
        };
      }
      return { role: msg.role, content: msg.content || "" };
    }

    // With tools: keep full structure
    const cleaned: Record<string, unknown> = { role: msg.role };

    if (msg.content !== undefined) {
      cleaned.content = msg.content ?? "";
    } else {
      cleaned.content = "";
    }

    if (
      msg.role === "assistant" &&
      msg.tool_calls &&
      msg.tool_calls.length > 0
    ) {
      cleaned.tool_calls = msg.tool_calls;
      if (!msg.content) cleaned.content = null;
    }

    if (msg.role === "tool" && msg.tool_call_id) {
      cleaned.tool_call_id = msg.tool_call_id;
    }

    return cleaned;
  });
}

/**
 * Build a tool description string for fallback mode (no function calling).
 */
function buildToolDescriptionPrompt(tools: ToolDefinition[]): string {
  const toolDescs = tools
    .map((t) => {
      const params = t.function.parameters as {
        properties?: Record<string, { type: string; description?: string }>;
      };
      const paramList = params.properties
        ? Object.entries(params.properties)
            .map(([k, v]) => `  - ${k} (${v.type}): ${v.description || ""}`)
            .join("\n")
        : "  (no parameters)";
      return `### ${t.function.name}\n${t.function.description}\nParameters:\n${paramList}`;
    })
    .join("\n\n");

  return `You have the following tools. To call a tool, respond with ONLY a JSON object (no markdown, no extra text):
{"tool": "<tool_name>", "args": {<arguments>}}

To provide a text response without calling a tool, respond normally with text.

Available tools:

${toolDescs}`;
}

/**
 * Make a single API call with automatic 429 rate-limit retry.
 * Uses exponential backoff: 2s, 4s, 8s (up to 3 retries).
 */
async function rawApiCall(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{
  ok: boolean;
  status: number;
  data?: OpenAIChatCompletionResponse;
  errorText?: string;
}> {
  const MAX_RATE_LIMIT_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, DEFAULT_REQUEST_TIMEOUT_MS);

    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (timedOut) {
        return { ok: false, status: 408, errorText: "Request timed out." };
      }
      const msg = error instanceof Error ? error.message : "Request failed";
      return { ok: false, status: 0, errorText: msg };
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", onAbort);
    }

    if (!response.ok) {
      // Handle 429 rate limiting with exponential backoff
      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
        console.log(
          `Rate limited (429). Retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      const errorText = await response.text();
      return { ok: false, status: response.status, errorText };
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text) as OpenAIChatCompletionResponse;
      return { ok: true, status: response.status, data };
    } catch {
      const snippet = text.length > 800 ? text.slice(0, 800) + "..." : text;
      return {
        ok: false,
        status: 502,
        errorText: `Invalid JSON response (first 800 chars): ${snippet}`,
      };
    }
  }

  // Should not reach here, but safety fallback
  return {
    ok: false,
    status: 429,
    errorText: "Rate limit exceeded after retries",
  };
}

/**
 * Call the OpenAI-compatible chat completion API.
 *
 * Strategy:
 * 1. Try with function calling (tools parameter) if available
 * 2. If function calling fails (500 error), automatically fall back to
 *    JSON-in-prompt mode where tools are described in the system prompt
 *    and the LLM responds with JSON to call tools.
 */
export async function chatCompletion(
  options: ChatCompletionOptions,
): Promise<ChatResponse> {
  const { apiKey, apiBaseUrl, model } =
    getPreferenceValues<Preferences.RecallFile>();
  const {
    messages,
    temperature = 0.3,
    maxTokens = 4000,
    tools,
    signal,
  } = options;

  const url = `${apiBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const hasTools = tools && tools.length > 0;

  const looksLikeToolUnsupported = (status: number, errorText?: string) => {
    if (![400, 404, 405, 415, 422].includes(status)) return false;
    const s = (errorText || "").toLowerCase();
    return (
      s.includes("tool") ||
      s.includes("tools") ||
      s.includes("tool_calls") ||
      s.includes("function") ||
      s.includes("function_call")
    );
  };

  // ── Mode 1: Try native function calling ──────────────────
  if (hasTools && !functionCallingDisabled) {
    const body: Record<string, unknown> = {
      model,
      messages: sanitizeMessages(messages, true),
      temperature,
      max_tokens: maxTokens,
      tools,
    };

    console.log(
      `LLM Request [tools mode]: model=${model}, msgs=${messages.length}, tools=${tools.length}`,
    );

    // Try up to 2 times
    let forceFallback = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1500));
        console.log(`Retrying tools mode (attempt ${attempt + 1})...`);
      }

      const result = await rawApiCall(url, apiKey, body, signal);

      if (result.ok && result.data) {
        const choice = result.data.choices[0];
        if (!choice) throw new Error("No response from LLM");

        const toolCalls: ToolCall[] | null = choice.message.tool_calls
          ? choice.message.tool_calls.map((tc) => ({
              id: tc.id,
              type: tc.type,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            }))
          : null;

        // Some providers/models ignore tools and return plain text.
        // Try parsing JSON tool calls from content; if not present, switch to fallback mode.
        if (!toolCalls || toolCalls.length === 0) {
          const content = choice.message.content || "";
          const parsed = parseToolCallFromText(content);
          if (parsed) return { content: null, toolCalls: [parsed] };

          console.log(
            "Tools mode returned no tool_calls. Switching to fallback mode for compatibility.",
          );
          functionCallingDisabled = true;
          forceFallback = true;
          break;
        }

        return { content: choice.message.content, toolCalls };
      }

      if (result.status >= 500) {
        console.log(
          `Tools mode failed (${result.status}), will try fallback...`,
        );
        continue;
      }

      if (result.status === 408 || result.status === 0) {
        console.log(
          `Tools mode request failed (${result.status}), switching to fallback mode.`,
        );
        functionCallingDisabled = true;
        forceFallback = true;
        break;
      }

      if (looksLikeToolUnsupported(result.status, result.errorText)) {
        console.log(
          `Tools mode likely unsupported (${result.status}). Switching to fallback mode.`,
        );
        functionCallingDisabled = true;
        forceFallback = true;
        break;
      }

      // Non-500 error: throw immediately
      throw new Error(`API Error (${result.status}): ${result.errorText}`);
    }

    if (!forceFallback) {
      // All tools-mode retries failed, disable for this session
      console.log(
        "Function calling disabled for this session. Switching to fallback mode.",
      );
      functionCallingDisabled = true;
    }
  }

  // ── Mode 2: Fallback — tools described in prompt, LLM responds with JSON ──
  if (hasTools) {
    const fallbackMessages = injectToolPromptIntoSystemMessage(messages, tools);

    const baseBody: Omit<Record<string, unknown>, "messages"> = {
      model,
      temperature,
      max_tokens: maxTokens,
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      const retryNudge: ChatMessage[] =
        attempt === 0
          ? []
          : [
              {
                role: "user",
                content:
                  "Your previous response was NOT a valid tool call. " +
                  "If you want to call a tool, respond with ONLY a single JSON object like " +
                  '{"tool":"search_files","args":{...}} (no markdown, no extra text).',
              },
            ];

      const msgCount = fallbackMessages.length + retryNudge.length;
      console.log(
        `LLM Request [fallback mode]: model=${model}, msgs=${msgCount}, attempt=${attempt + 1}`,
      );

      const result = await rawApiCall(
        url,
        apiKey,
        {
          ...baseBody,
          messages: sanitizeMessages(
            [...fallbackMessages, ...retryNudge],
            false,
          ),
        },
        signal,
      );

      if (!result.ok) {
        throw new Error(`API Error (${result.status}): ${result.errorText}`);
      }

      if (!result.data) throw new Error("No response from LLM");
      const choice = result.data.choices[0];
      if (!choice) throw new Error("No response from LLM");

      const content = choice.message.content || "";

      // Try to parse as tool call JSON
      const toolCall = parseToolCallFromText(content);
      if (toolCall) {
        return {
          content: null,
          toolCalls: [toolCall],
        };
      }

      // If it still isn't a tool call, try again once with a stronger nudge.
      if (attempt === 0) continue;

      // Not a tool call — regular text response
      return { content, toolCalls: null };
    }

    return { content: "Agent did not produce a tool call.", toolCalls: null };
  }

  // ── No tools — simple chat completion ──────────────────
  const body: Record<string, unknown> = {
    model,
    messages: sanitizeMessages(messages, false),
    temperature,
    max_tokens: maxTokens,
  };

  const result = await rawApiCall(url, apiKey, body, signal);
  if (!result.ok) {
    throw new Error(`API Error (${result.status}): ${result.errorText}`);
  }
  if (!result.data) throw new Error("No response from LLM");
  const choice = result.data.choices[0];
  if (!choice) throw new Error("No response from LLM");

  return { content: choice.message.content, toolCalls: null };
}

/**
 * Try to parse a tool call from the LLM's text response.
 * Expected format: {"tool": "tool_name", "args": {...}}
 * Also accepts common LLM variations: kwargs, parameters, arguments, input
 */
function parseToolCallFromText(text: string): ToolCall | null {
  const tryParseJsonObject = (candidate: string): unknown | null => {
    const trimmed = candidate.trim();
    if (!trimmed) return null;

    // First try strict JSON.
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fallback: tolerate trailing commas like {"a":1,} or [1,2,]
      // LLMs often emit these; JSON.parse rejects them.
      const withoutTrailingCommas = trimmed.replace(/,(\s*[}\]])/g, "$1");
      try {
        return JSON.parse(withoutTrailingCommas);
      } catch {
        return null;
      }
    }
  };

  try {
    // Extract JSON from the response (may have markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [
      null,
      text,
    ];
    const jsonStr = (jsonMatch[1] ?? text).trim();

    // Try to find a JSON object
    const braceStart = jsonStr.indexOf("{");
    const braceEnd = jsonStr.lastIndexOf("}");
    if (braceStart === -1 || braceEnd === -1) return null;

    const parsed = tryParseJsonObject(
      jsonStr.substring(braceStart, braceEnd + 1),
    ) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") return null;

    // Accept various tool name keys
    const toolName =
      (parsed as Record<string, unknown>).tool ||
      (parsed as Record<string, unknown>).name ||
      (parsed as Record<string, unknown>).function ||
      (parsed as Record<string, unknown>).tool_name;
    if (toolName && typeof toolName === "string") {
      // Accept various argument keys that LLMs commonly use
      const toolArgs =
        (parsed as Record<string, unknown>).args ||
        (parsed as Record<string, unknown>).kwargs ||
        (parsed as Record<string, unknown>).parameters ||
        (parsed as Record<string, unknown>).arguments ||
        (parsed as Record<string, unknown>).input ||
        {};
      return {
        id: `fallback_${Date.now()}`,
        type: "function",
        function: {
          name: toolName,
          arguments: JSON.stringify(toolArgs),
        },
      };
    }
  } catch {
    // Not valid JSON — it's a text response
  }

  return null;
}

// ─── Streaming Chat Completion ───────────────────────────────

/**
 * Stream-based SSE delta event (partial tool call or content).
 */
interface StreamDelta {
  content?: string | null;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: "function";
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

/**
 * Streaming chat completion with SSE parsing.
 * Emits partial content via onPartialContent callback for real-time UI updates.
 * Falls back to non-streaming if SSE fails.
 */
export async function streamChatCompletion(
  options: ChatCompletionOptions & {
    onPartialContent?: (text: string) => void;
  },
): Promise<ChatResponse> {
  const { apiKey, apiBaseUrl, model } =
    getPreferenceValues<Preferences.RecallFile>();
  const {
    messages,
    temperature = 0.3,
    maxTokens = 4000,
    tools,
    signal,
    onPartialContent,
  } = options;

  const url = `${apiBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const hasTools = tools && tools.length > 0;

  // If the caller doesn't want partial content, just do non-streaming.
  if (!onPartialContent) {
    return chatCompletion(options);
  }

  // If streaming has proven unsupported, don't keep retrying.
  if (streamingDisabled) {
    return chatCompletion(options);
  }

  const canTryNativeToolsStreaming = hasTools && !functionCallingDisabled;
  const streamModes: Array<"native-tools" | "fallback-prompt"> =
    canTryNativeToolsStreaming
      ? ["native-tools", "fallback-prompt"]
      : ["fallback-prompt"];

  for (const mode of streamModes) {
    const nativeMode = mode === "native-tools";
    const requestMessages: ChatMessage[] =
      !nativeMode && hasTools
        ? injectToolPromptIntoSystemMessage(messages, tools)
        : messages;

    const body: Record<string, unknown> = nativeMode
      ? {
          model,
          messages: sanitizeMessages(requestMessages, true),
          temperature,
          max_tokens: maxTokens,
          tools,
          stream: true,
        }
      : {
          model,
          messages: sanitizeMessages(requestMessages, false),
          temperature,
          max_tokens: maxTokens,
          stream: true,
        };

    console.log(
      `LLM Stream Request: model=${model}, msgs=${messages.length}, tools=${(tools || []).length}, mode=${mode}`,
    );

    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, DEFAULT_REQUEST_TIMEOUT_MS);

    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        // If streaming isn't supported in native-tools mode, try fallback-prompt streaming.
        if (
          (response.status === 400 || response.status === 404) &&
          nativeMode
        ) {
          console.log(
            "Native-tools streaming not supported; trying fallback-prompt streaming.",
          );
          continue;
        }

        // Handle rate limiting
        if (response.status === 429) {
          console.log("Rate limited during streaming, falling back.");
          return chatCompletion(options);
        }

        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        if (nativeMode) continue;
        console.log("No response body for streaming, falling back.");
        return chatCompletion(options);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/event-stream")) {
        if (nativeMode) {
          console.log(
            `Unexpected content-type for native-tools streaming (${contentType}); trying fallback-prompt streaming.`,
          );
          continue;
        }
        console.log(
          `Unexpected content-type for streaming (${contentType}). Falling back to non-streaming.`,
        );
        streamingDisabled = true;
        return chatCompletion(options);
      }

      // Parse SSE stream
      let contentAccum = "";
      const toolCallAccum: Map<
        number,
        { id: string; name: string; arguments: string }
      > = new Map();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        let streamDone = false;
        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) {
            streamDone = true;
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data) as {
                choices: Array<{
                  delta: StreamDelta;
                  finish_reason: string | null;
                }>;
              };
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;

              // Accumulate text content
              if (delta.content) {
                contentAccum += delta.content;
                onPartialContent?.(delta.content);
              }

              // Accumulate tool calls
              if (nativeMode && delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const existing = toolCallAccum.get(tc.index);
                  if (!existing) {
                    toolCallAccum.set(tc.index, {
                      id: tc.id || "",
                      name: tc.function?.name || "",
                      arguments: tc.function?.arguments || "",
                    });
                  } else {
                    if (tc.id) existing.id = tc.id;
                    if (tc.function?.name) existing.name += tc.function.name;
                    if (tc.function?.arguments)
                      existing.arguments += tc.function.arguments;
                  }
                }
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      const toolCalls: ToolCall[] | null =
        nativeMode && toolCallAccum.size > 0
          ? Array.from(toolCallAccum.values()).map((tc) => ({
              id:
                tc.id ||
                `stream_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              type: "function" as const,
              function: {
                name: tc.name,
                arguments: tc.arguments,
              },
            }))
          : null;

      if (!nativeMode && hasTools) {
        const parsedToolCall = parseToolCallFromText(contentAccum);
        if (parsedToolCall) {
          return { content: null, toolCalls: [parsedToolCall] };
        }
      }

      return { content: contentAccum || null, toolCalls };
    } catch (error) {
      if (timedOut) {
        console.log("Streaming request timed out, falling back.");
        if (mode === "native-tools") continue;
        streamingDisabled = true;
        return chatCompletion(options);
      }

      if (
        error instanceof DOMException ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        throw error;
      }
      console.log(
        `Streaming failed: ${error instanceof Error ? error.message : "unknown"}, falling back.`,
      );

      // If native mode failed, try fallback mode next; otherwise disable streaming.
      if (mode === "native-tools") continue;
      streamingDisabled = true;
      return chatCompletion(options);
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }

  streamingDisabled = true;
  return chatCompletion(options);
}

// ─── Multimodal: Image Analysis ──────────────────────────────

/**
 * Analyze an image using the LLM's multimodal (vision) capability.
 * Sends the image as a base64 data URI.
 *
 * @param imageBase64 - Base64-encoded image data
 * @param mimeType - Image MIME type (e.g. "image/jpeg")
 * @param question - What to analyze (e.g. "Describe this image in detail")
 * @returns The LLM's text description, or an error message
 */
export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  question: string,
): Promise<string> {
  const { apiKey, apiBaseUrl, model } =
    getPreferenceValues<Preferences.RecallFile>();
  const url = `${apiBaseUrl.replace(/\/$/, "")}/chat/completions`;

  // Construct multimodal message with image_url content part
  const body = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: question },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "low", // Use low detail to save tokens
            },
          },
        ],
      },
    ],
    max_tokens: 500,
    temperature: 0.2,
  };

  console.log(
    `Vision request: model=${model}, question=${question.slice(0, 50)}...`,
  );

  try {
    const result = await rawApiCall(url, apiKey, body);

    if (!result.ok) {
      // If the model doesn't support vision, return a clear message
      if (result.status === 400 || result.status === 422) {
        return "[Vision not supported by current model. Use get_file_metadata instead for image info.]";
      }
      return `[Image analysis failed: HTTP ${result.status}]`;
    }

    if (!result.data) return "[No response from LLM]";
    const choice = result.data.choices[0];
    if (!choice) return "[No response from LLM]";

    return choice.message.content || "[Empty response]";
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.log(`Vision request failed: ${msg}`);
    return `[Image analysis failed: ${msg}]`;
  }
}
