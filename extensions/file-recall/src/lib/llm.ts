import { getPreferenceValues } from "@raycast/api";
import { ChatMessage, ChatResponse, ToolDefinition, ToolCall } from "./types";

interface Preferences {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
}

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
}

/**
 * Track whether function calling has ever failed for this session.
 * If so, always use fallback mode for the rest of the session.
 */
let functionCallingDisabled = false;

/**
 * Reset function calling state. Call at the start of each agent run.
 */
export function resetFunctionCallingState(): void {
  functionCallingDisabled = false;
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
 * Make a single API call (no retry, no fallback).
 */
async function rawApiCall(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{
  ok: boolean;
  status: number;
  data?: OpenAIChatCompletionResponse;
  errorText?: string;
}> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, status: response.status, errorText };
  }

  const data = (await response.json()) as OpenAIChatCompletionResponse;
  return { ok: true, status: response.status, data };
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
  const { apiKey, apiBaseUrl, model } = getPreferenceValues<Preferences>();
  const { messages, temperature = 0.3, maxTokens = 4000, tools } = options;

  const url = `${apiBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const hasTools = tools && tools.length > 0;

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
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1500));
        console.log(`Retrying tools mode (attempt ${attempt + 1})...`);
      }

      const result = await rawApiCall(url, apiKey, body);

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

        return { content: choice.message.content, toolCalls };
      }

      if (result.status >= 500) {
        console.log(
          `Tools mode failed (${result.status}), will try fallback...`,
        );
        continue;
      }

      // Non-500 error: throw immediately
      throw new Error(`API Error (${result.status}): ${result.errorText}`);
    }

    // All tools-mode retries failed, disable for this session
    console.log(
      "Function calling disabled for this session. Switching to fallback mode.",
    );
    functionCallingDisabled = true;
  }

  // ── Mode 2: Fallback — tools described in prompt, LLM responds with JSON ──
  if (hasTools) {
    const toolPrompt = buildToolDescriptionPrompt(tools);

    // Inject tool descriptions into the first system message
    const fallbackMessages = messages.map((msg, i) => {
      if (i === 0 && msg.role === "system") {
        return { ...msg, content: (msg.content || "") + "\n\n" + toolPrompt };
      }
      return msg;
    });

    const body: Record<string, unknown> = {
      model,
      messages: sanitizeMessages(fallbackMessages, false),
      temperature,
      max_tokens: maxTokens,
    };

    console.log(
      `LLM Request [fallback mode]: model=${model}, msgs=${fallbackMessages.length}`,
    );

    const result = await rawApiCall(url, apiKey, body);

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

    // Not a tool call — regular text response
    return { content, toolCalls: null };
  }

  // ── No tools — simple chat completion ──────────────────
  const body: Record<string, unknown> = {
    model,
    messages: sanitizeMessages(messages, false),
    temperature,
    max_tokens: maxTokens,
  };

  const result = await rawApiCall(url, apiKey, body);
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
 */
function parseToolCallFromText(text: string): ToolCall | null {
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

    const parsed = JSON.parse(jsonStr.substring(braceStart, braceEnd + 1));

    if (parsed.tool && typeof parsed.tool === "string") {
      return {
        id: `fallback_${Date.now()}`,
        type: "function",
        function: {
          name: parsed.tool,
          arguments: JSON.stringify(parsed.args || {}),
        },
      };
    }
  } catch {
    // Not valid JSON — it's a text response
  }

  return null;
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
  const { apiKey, apiBaseUrl, model } = getPreferenceValues<Preferences>();
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
