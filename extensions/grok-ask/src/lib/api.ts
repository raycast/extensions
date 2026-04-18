import { parseSSEChunk } from "./sse";
import { classifyError } from "./errors";
import { isReasoningModel } from "./models";
import { extractDomain } from "./markdown";
import type { GrokRequestParams, StreamCallbacks, Citation } from "../types";

const API_BASE = "https://api.x.ai/v1";
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function streamGrokResponse(
  params: GrokRequestParams,
  callbacks: StreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const { apiKey, model, messages, systemPrompt } = params;

  const body: Record<string, unknown> = {
    model,
    input: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    tools: [{ type: "web_search" }],
  };

  if (isReasoningModel(model)) {
    body.reasoning = { effort: "high", summary: "auto" };
  }

  if (systemPrompt) {
    body.instructions = systemPrompt;
  }

  let response: Response | undefined;
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal.aborted) return;

    try {
      response = await fetch(`${API_BASE}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      callbacks.onError(classifyError(0, String(err)));
      return;
    }

    if (response.ok) break;

    lastError = await response.text().catch(() => "");
    const retryAfter = response.headers.get("retry-after") || undefined;

    if (response.status >= 500 && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      continue;
    }

    callbacks.onError(classifyError(response.status, lastError, retryAfter));
    return;
  }

  if (!response || !response.ok) {
    callbacks.onError(classifyError(response?.status || 0, lastError || ""));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(classifyError(0, "No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let sseBuffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const { events, remaining } = parseSSEChunk(chunk, sseBuffer);
      sseBuffer = remaining;

      for (const sseEvent of events) {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(sseEvent.data);
        } catch {
          continue;
        }

        switch (sseEvent.event) {
          case "response.output_text.delta":
            callbacks.onText(data.delta as string);
            break;

          case "response.reasoning_summary_text.delta":
            callbacks.onReasoning(data.delta as string);
            break;

          case "response.web_search_call.in_progress":
          case "response.web_search_call.searching":
            callbacks.onSearching(data.query as string | undefined);
            break;

          case "response.web_search_call.completed":
            callbacks.onSearchComplete();
            break;

          case "response.output_text.annotation.added": {
            const annotation = data.annotation as
              | { type: string; url: string; title: string }
              | undefined;
            if (annotation?.type === "url_citation") {
              let title = annotation.title?.trim() || "";
              if (!title || /^\d+$/.test(title)) {
                title = extractDomain(annotation.url);
              }
              const cite: Citation = {
                index: (data.annotation_index as number) + 1,
                title,
                url: annotation.url,
              };
              callbacks.onAnnotation(cite);
            }
            break;
          }

          case "response.completed":
            callbacks.onComplete();
            return;

          case "response.failed": {
            const errorBody = JSON.stringify(data);
            callbacks.onError(classifyError(0, errorBody));
            return;
          }

          case "response.incomplete":
            callbacks.onComplete();
            return;
        }
      }
    }

    callbacks.onComplete();
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    callbacks.onError(classifyError(0, String(err)));
  }
}
