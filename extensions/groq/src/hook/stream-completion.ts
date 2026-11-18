import type { ChatCompletion, ChatCompletionChunk } from "openai/resources";
import { isStream } from "./utils";

export async function consumeCompletion(
  response: ChatCompletion | AsyncIterable<ChatCompletionChunk>,
  options: { onUpdate: (text: string, rawText: string) => void; thinking?: boolean; signal?: AbortSignal },
): Promise<void> {
  const { onUpdate, signal } = options;
  const closingTag = "</think>";
  let startedOutput = !options.thinking;
  let searchBuffer = "";
  let rawText = "";
  let text = "";
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const flush = () => {
    cancel();
    if (!dirty || signal?.aborted) return;
    dirty = false;
    onUpdate(text, rawText);
  };
  const append = (part: string) => {
    if (!part || signal?.aborted) return;
    rawText += part;
    if (!startedOutput) {
      const combined = searchBuffer + part;
      const idx = combined.indexOf(closingTag);
      if (idx !== -1) {
        startedOutput = true;
        text = combined.slice(idx + closingTag.length);
        searchBuffer = "";
      } else {
        text += part;
        searchBuffer = combined.slice(-(closingTag.length - 1));
      }
    } else {
      text += part;
    }
    dirty = true;
    // Groq can deliver many chunks in one event-loop turn. Bound Raycast view updates,
    // while keeping every chunk for the final flush.
    timer ??= setTimeout(flush, 100);
  };

  signal?.addEventListener("abort", cancel, { once: true });
  try {
    if (isStream(response)) {
      for await (const part of response) {
        if (signal?.aborted) break;
        append(part.choices[0]?.delta?.content ?? "");
      }
    } else {
      append(response.choices[0]?.message?.content ?? "");
    }
  } finally {
    flush();
    signal?.removeEventListener("abort", cancel);
  }
}
