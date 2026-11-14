import { completionUrl, normalizeBaseUrl } from "./tools";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Provider {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export function providerForTool(
  defaults: Provider,
  override: { baseUrl?: string; model?: string },
): Provider {
  const baseUrl = normalizeBaseUrl(override.baseUrl || defaults.baseUrl);
  const sameOrigin =
    !override.baseUrl ||
    new URL(baseUrl).origin === new URL(defaults.baseUrl).origin;
  return {
    baseUrl,
    model: override.model || defaults.model,
    apiKey: sameOrigin ? defaults.apiKey : undefined,
  };
}

type Completion = {
  error?: { message?: string };
  choices?: {
    delta?: { content?: string; refusal?: string };
    message?: { content?: string };
    finish_reason?: string | null;
  }[];
};

function providerError(status: number, body: string): Error {
  let detail = "";
  try {
    const parsed = JSON.parse(body);
    detail = parsed.error?.message ?? parsed.message ?? "";
  } catch {
    // Gateways sometimes return an HTML error page instead of JSON.
  }
  const hint =
    status === 401 || status === 403
      ? "Check the provider API key and model access."
      : status === 404
        ? "Check the API endpoint, including your provider's /v1 prefix."
        : status === 429
          ? "The provider is rate-limited or its quota is exhausted. Try again later."
          : "Check the provider and model settings.";
  return new Error(`Provider returned HTTP ${status}. ${detail || hint}`);
}

export async function readCompletionStream(
  body: ReadableStream<Uint8Array>,
  onToken: (token: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];
  let done = false;
  let finished = false;
  let receivedText = false;
  let failed = false;

  function dispatch() {
    if (!data.length) return;
    const event = data.join("\n");
    data = [];
    if (event.trim() === "[DONE]") {
      done = true;
      return;
    }
    let payload: Completion;
    try {
      payload = JSON.parse(event) as Completion;
    } catch {
      throw new Error("The provider sent invalid streaming JSON.");
    }
    if (payload.error)
      throw new Error(
        payload.error.message || "The provider reported a streaming error.",
      );
    const choice = payload.choices?.[0];
    const text = choice?.delta?.content ?? choice?.delta?.refusal;
    if (typeof text === "string" && text) {
      receivedText = true;
      onToken(text);
    }
    if (choice?.finish_reason) {
      finished = true;
      if (choice.finish_reason === "length") {
        onToken("\n\n> Response truncated by the provider's output limit.");
      }
    }
  }

  function line(value: string) {
    value = value.replace(/\r$/, "");
    if (!value) dispatch();
    else if (value.startsWith("data:"))
      data.push(value.slice(5).replace(/^ /, ""));
  }

  try {
    while (!done) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let end: number;
      while (!done && (end = buffer.indexOf("\n")) !== -1) {
        line(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
      }
      if (chunk.done) {
        if (buffer && !done) line(buffer);
        if (!done) dispatch();
        break;
      }
    }
    if (!done && !finished)
      throw new Error(
        "The connection ended before the response completed. Retry the request.",
      );
    if (!receivedText)
      throw new Error(
        "The provider returned no text. Try another model or check the provider logs.",
      );
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (done || failed) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function streamCompletion(
  provider: Provider,
  messages: Message[],
  onToken: (token: string) => void,
  signal: AbortSignal,
  timeoutMs = 180_000,
): Promise<void> {
  const combinedSignal = AbortSignal.any([
    signal,
    AbortSignal.timeout(timeoutMs),
  ]);
  let response: Response;
  try {
    response = await fetch(completionUrl(provider.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(provider.apiKey?.trim()
          ? { Authorization: `Bearer ${provider.apiKey.trim()}` }
          : {}),
      },
      body: JSON.stringify({
        model: provider.model.trim(),
        messages,
        stream: true,
      }),
      signal: combinedSignal,
    });
  } catch (error) {
    if (combinedSignal.aborted) throw combinedSignal.reason;
    throw new Error(
      `Cannot reach the AI provider. Check the API endpoint and make sure your provider app or server is running. ${error instanceof Error ? error.message : ""}`,
    );
  }
  if (!response.ok) throw providerError(response.status, await response.text());
  if (response.headers.get("content-type")?.includes("application/json")) {
    const payload = (await response.json()) as Completion;
    if (payload.error)
      throw new Error(payload.error.message || "Provider error.");
    const text = payload.choices?.[0]?.message?.content;
    if (!text) throw new Error("The provider returned no text.");
    onToken(text);
    return;
  }
  if (!response.body)
    throw new Error("The provider returned an empty response body.");
  await readCompletionStream(response.body, onToken);
}
