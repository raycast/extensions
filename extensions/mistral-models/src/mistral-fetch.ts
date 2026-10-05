import { EventSourceParserStream, type EventSourceMessage } from "eventsource-parser/stream";

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Compatibility for @ai-sdk/mistral's assumption that every SSE event has a choice. */
export async function mistralFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    return response;
  }

  const body = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())
    .pipeThrough(
      new TransformStream<EventSourceMessage, string>({
        transform({ data }, controller) {
          if (data === "[DONE]") {
            controller.enqueue("data: [DONE]\n\n");
            return;
          }
          let payload: unknown;
          try {
            payload = JSON.parse(data);
          } catch {
            throw new Error("Mistral returned a malformed stream event. Please retry the response.");
          }
          const event = record(payload);
          if (event && Array.isArray(event.choices)) {
            // Preserve the usage-only event, but give the SDK an empty delta to read.
            // No finish reason is fabricated: the real terminal event is still required.
            if (event.choices.length === 0 && record(event.usage)) {
              event.choices = [{ index: 0, delta: {}, finish_reason: null }];
            }
          }
          controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
        },
      }),
    )
    .pipeThrough(new TextEncoderStream());

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
