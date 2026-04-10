import { getBaseUrl, getThinkingBody, getThinkingDirective, getProviderConfig } from "./providers";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onReasoning?: (delta: string) => void;
  onContent?: (delta: string) => void;
  onComplete?: (reasoning: string, content: string) => void;
  onError?: (error: Error) => void;
}

function applyThinkingDirective(content: string, directive: string): string {
  const stripped = content.replace(/\n\/(?:think|no_think)\s*$/u, "");
  return `${stripped}\n${directive}`;
}

export function createStreamRequest(
  providerKey: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  customBaseUrl?: string,
  temperature?: number,
  maxTokens?: number,
  thinkingEnabled?: boolean
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const baseUrl = getBaseUrl(providerKey, customBaseUrl);
      const url = `${baseUrl}/chat/completions`;

      const body: Record<string, unknown> = {
        model,
        messages: messages.map(({ role, content }, index) => {
          const isLastUserMessage = index === messages.length - 1 && role === "user";
          const directive = isLastUserMessage ? getThinkingDirective(providerKey, thinkingEnabled ?? false, model) : null;

          return {
            role,
            content: directive ? applyThinkingDirective(content, directive) : content,
          };
        }),
        stream: true,
      };

      const config = getProviderConfig(providerKey);
      const tb = getThinkingBody(providerKey, thinkingEnabled ?? false, model);
      if (tb) {
        if (config.thinkingPlacement === "extraBody") {
          body.extra_body = tb;
        } else {
          Object.assign(body, tb);
        }
      }

      if (temperature !== undefined) body.temperature = temperature;
      if (maxTokens !== undefined) body.max_tokens = maxTokens;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let reasoning = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta;

            if (delta?.reasoning_content) {
              reasoning += delta.reasoning_content;
              callbacks.onReasoning?.(delta.reasoning_content);
            }
            if (delta?.content) {
              content += delta.content;
              callbacks.onContent?.(delta.content);
            }
          } catch {
            // Skip non-parseable SSE lines — these are typically partial
            // chunks or provider-specific non-JSON lines. HTTP-level errors
            // are caught above by the response.ok check.
          }
        }
      }

      callbacks.onComplete?.(reasoning, content);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return controller;
}
