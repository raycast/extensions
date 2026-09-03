import { EventEmitter } from "stream";
import { CustomModel, CustomProvider, UnifiedChatMessage } from "./types";
import { getProviderApiKey } from "./model-sync";
import { OllamaApiChatMessageToolCall } from "../ollama/types";
import { OllamaApiChatMessageRole } from "../ollama/enum";

export interface OpenAiChatRequestOptions {
  model: string;
  messages: UnifiedChatMessage[];
  temperature?: number;
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
}

export class OpenAiClient {
  private _provider: CustomProvider;
  private _model?: CustomModel;

  constructor(provider: CustomProvider, model?: CustomModel) {
    this._provider = provider;
    this._model = model;
  }

  private getChatCompletionsUrl(): string {
    const baseUrl = this._provider.base_url.trim().replace(/\/+$/, "");
    if (baseUrl.endsWith("/chat/completions")) {
      return baseUrl;
    }
    return `${baseUrl}/chat/completions`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream, application/json",
    };

    const apiKey = getProviderApiKey(this._provider, this._model?.provider);
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    return headers;
  }

  private formatMessages(messages: UnifiedChatMessage[]): Array<Record<string, unknown>> {
    return messages.map((msg) => {
      // Tool response message
      if (msg.role === "tool") {
        return {
          role: "tool",
          content: msg.content,
          tool_call_id: msg.tool_call_id || "call_1",
          name: msg.tool_name,
        };
      }

      // Assistant message with tool calls
      if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) {
        return {
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.function.name,
              arguments:
                typeof tc.function.arguments === "string"
                  ? tc.function.arguments
                  : JSON.stringify(tc.function.arguments),
            },
          })),
        };
      }

      // Multimodal user message with images
      if (msg.role === "user" && msg.images && msg.images.length > 0) {
        const contentParts: Array<Record<string, unknown>> = [];
        if (msg.content) {
          contentParts.push({ type: "text", text: msg.content });
        }
        for (const img of msg.images) {
          contentParts.push({
            type: "image_url",
            image_url: {
              url: img.base64.startsWith("data:") ? img.base64 : `data:image/jpeg;base64,${img.base64}`,
            },
          });
        }
        return {
          role: "user",
          content: contentParts,
        };
      }

      // Standard message
      return {
        role: msg.role,
        content: msg.content,
      };
    });
  }

  /**
   * Run streaming chat inference
   */
  async chatStream(options: OpenAiChatRequestOptions): Promise<EventEmitter> {
    const emitter = new EventEmitter();
    const url = this.getChatCompletionsUrl();
    const headers = this.getHeaders();

    const body: Record<string, unknown> = {
      model: options.model,
      messages: this.formatMessages(options.messages),
      stream: true,
      ...(this._provider.additional_parameters || {}),
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
    }

    const THROTTLE_MS = 30;
    let lastEmitTime = 0;
    let textThinkingBuffer = "";
    let textContentBuffer = "";

    const emitBuffer = () => {
      const now = Date.now();
      if (now - lastEmitTime >= THROTTLE_MS) {
        if (textThinkingBuffer !== "") {
          emitter.emit("thinking", textThinkingBuffer);
          textThinkingBuffer = "";
        }
        if (textContentBuffer !== "") {
          emitter.emit("data", textContentBuffer);
          textContentBuffer = "";
        }
        lastEmitTime = now;
      }
    };

    const flushBuffer = () => {
      if (textThinkingBuffer !== "") {
        emitter.emit("thinking", textThinkingBuffer);
        textThinkingBuffer = "";
      }
      if (textContentBuffer !== "") {
        emitter.emit("data", textContentBuffer);
        textContentBuffer = "";
      }
    };

    const processStream = async () => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          let errorMsg = `${response.status} ${response.statusText}`;
          try {
            const errJson = (await response.json()) as { error?: { message?: string } | string };
            if (typeof errJson.error === "string") errorMsg = errJson.error;
            else if (errJson.error?.message) errorMsg = errJson.error.message;
          } catch {
            // Ignore json parse error
          }
          emitter.emit("error", new Error(`Provider API error: ${errorMsg}`));
          return;
        }

        if (!response.body) {
          emitter.emit("error", new Error("No response body received from provider"));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const accumulatedTools: Record<number, { id: string; name: string; arguments: string }> = {};
        let insideThinkTag = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const dataContent = trimmed.replace(/^data:\s*/, "");
            if (dataContent === "[DONE]") {
              break;
            }

            let parsed: {
              id?: string;
              choices?: Array<{
                delta?: {
                  content?: string | null;
                  reasoning_content?: string | null;
                  reasoning?: string | null;
                  tool_calls?: Array<{
                    index?: number;
                    id?: string;
                    function?: { name?: string; arguments?: string };
                  }>;
                };
                finish_reason?: string | null;
              }>;
              usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                total_tokens?: number;
              };
            };

            try {
              parsed = JSON.parse(dataContent);
            } catch {
              continue;
            }

            const choice = parsed.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;
            if (!delta) continue;

            // Handle explicit reasoning fields (e.g. DeepSeek-R1, Groq, Together)
            const reasoning = delta.reasoning_content || delta.reasoning;
            if (reasoning) {
              textThinkingBuffer += reasoning;
              emitBuffer();
            }

            // Handle content text
            if (delta.content) {
              let content = delta.content;

              // Check for inline <think>...</think> tags if not already using reasoning_content
              if (!reasoning) {
                if (!insideThinkTag && content.includes("<think>")) {
                  insideThinkTag = true;
                  const parts = content.split("<think>");
                  if (parts[0]) {
                    textContentBuffer += parts[0];
                  }
                  content = parts[1] || "";
                }

                if (insideThinkTag) {
                  if (content.includes("</think>")) {
                    const parts = content.split("</think>");
                    textThinkingBuffer += parts[0];
                    insideThinkTag = false;
                    content = parts[1] || "";
                  } else {
                    textThinkingBuffer += content;
                    content = "";
                  }
                }
              }

              if (content) {
                textContentBuffer += content;
              }
              emitBuffer();
            }

            // Handle streaming tool calls
            if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!accumulatedTools[idx]) {
                  accumulatedTools[idx] = {
                    id: tc.id || `call_${idx}`,
                    name: tc.function?.name || "",
                    arguments: tc.function?.arguments || "",
                  };
                } else {
                  if (tc.id) accumulatedTools[idx].id = tc.id;
                  if (tc.function?.name) accumulatedTools[idx].name += tc.function.name;
                  if (tc.function?.arguments) accumulatedTools[idx].arguments += tc.function.arguments;
                }
              }
            }
          }
        }

        flushBuffer();

        // Emit tool calls if any were accumulated
        const toolKeys = Object.keys(accumulatedTools);
        if (toolKeys.length > 0) {
          const finalToolCalls: OllamaApiChatMessageToolCall[] = toolKeys.map((key) => {
            const item = accumulatedTools[Number(key)];
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = JSON.parse(item.arguments);
            } catch {
              parsedArgs = { raw: item.arguments };
            }
            return {
              id: item.id,
              function: {
                index: Number(key),
                name: item.name,
                arguments: parsedArgs,
              },
            };
          });
          emitter.emit("tool_calls", finalToolCalls);
        }

        // Flush any buffered tokens before emitting done
        flushBuffer();

        // Emit done event
        emitter.emit("done", {
          model: options.model,
          created_at: new Date().toISOString(),
          done: true,
          message: {
            role: OllamaApiChatMessageRole.Assistant,
            content: "",
          },
        });
      } catch (err) {
        emitter.emit("error", err instanceof Error ? err : new Error(String(err)));
      }
    };

    processStream();
    return emitter;
  }

  /**
   * Run non-streaming chat inference (e.g. for background text replacement)
   */
  async chatNoStream(options: OpenAiChatRequestOptions): Promise<string> {
    const url = this.getChatCompletionsUrl();
    const headers = this.getHeaders();

    const body: Record<string, unknown> = {
      model: options.model,
      messages: this.formatMessages(options.messages),
      stream: false,
      ...(this._provider.additional_parameters || {}),
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMsg = `${response.status} ${response.statusText}`;
      try {
        const errJson = (await response.json()) as { error?: { message?: string } | string };
        if (typeof errJson.error === "string") errorMsg = errJson.error;
        else if (errJson.error?.message) errorMsg = errJson.error.message;
      } catch {
        // Ignore json parse error
      }
      throw new Error(`Provider API error: ${errorMsg}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return json.choices?.[0]?.message?.content || "";
  }
}
