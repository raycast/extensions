import type {
  ChatMessage,
  ChatRequest,
  Tool,
  ToolCall,
  ProviderConfig,
} from "./types";
import { sendChatWithTools, sendChatStream } from "./api";
import { webSearch, formatSearchContext } from "./web-search";

/** Built-in tools available for tool-calling models. */
export const BUILT_IN_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for up-to-date information. Use this when the user asks about current events, prices, news, or anything that requires recent data.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query",
          },
        },
        required: ["query"],
      },
    },
  },
];

/**
 * Execute a single tool call and return the result string.
 */
async function executeTool(toolCall: ToolCall): Promise<string> {
  const { name, arguments: argsJson } = toolCall.function;

  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return `Error: Invalid JSON arguments for tool "${name}"`;
  }

  switch (name) {
    case "web_search": {
      const query = args.query as string;
      if (!query) return "Error: Missing query parameter";
      try {
        const results = await webSearch(query);
        return formatSearchContext(results);
      } catch (err) {
        return `Search error: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    }
    default:
      return `Error: Unknown tool "${name}"`;
  }
}

/**
 * Run a chat request with tool calling support.
 *
 * Protocol:
 * 1. Send request with tools (non-streaming)
 * 2. If finish_reason === "tool_calls": execute tools, append results, loop
 * 3. Max 3 rounds to prevent infinite loops
 * 4. Final response returned as a streaming ReadableStream
 */
export async function runWithTools(
  config: ProviderConfig,
  request: ChatRequest,
  tools: Tool[],
): Promise<{ stream: ReadableStream; toolMessages: ChatMessage[] }> {
  const messages = [...request.messages];
  const toolMessages: ChatMessage[] = [];
  const maxRounds = 3;

  for (let round = 0; round < maxRounds; round++) {
    const response = await sendChatWithTools(
      config,
      { ...request, messages },
      tools,
    );

    const choice = response.choices[0];
    if (!choice) throw new Error("No response from model");

    // If the model wants to call tools
    if (
      choice.finish_reason === "tool_calls" &&
      choice.message.tool_calls?.length
    ) {
      // Add assistant message with tool calls
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: choice.message.content || "",
        tool_calls: choice.message.tool_calls,
      };
      messages.push(assistantMsg);
      toolMessages.push(assistantMsg);

      // Execute each tool call and add results
      for (const tc of choice.message.tool_calls) {
        const result = await executeTool(tc);
        const toolMsg: ChatMessage = {
          role: "tool",
          content: result,
          tool_call_id: tc.id,
        };
        messages.push(toolMsg);
        toolMessages.push(toolMsg);
      }

      // Continue loop — send updated messages back to model
      continue;
    }

    // Model returned a final text response (not tool calls) — fall through
    // to the streaming request below. This also handles the case where all
    // maxRounds are exhausted: the accumulated tool results in `messages`
    // are sent back to the model without the `tools` parameter, prompting
    // it to produce a final text answer instead of requesting more tools.
    break;
  }

  // Stream the final response (without tools, so the model generates text)
  const stream = await sendChatStream(config, { ...request, messages });
  return { stream, toolMessages };
}
