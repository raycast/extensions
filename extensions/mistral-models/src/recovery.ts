import type { AI } from "@raycast/api";
import type { LanguageModelUsage, TextStreamPart, ToolSet } from "ai";
import { complete } from "./completion";
import { completionGuard } from "./completion-guard";

type Part = TextStreamPart<ToolSet>;
const continuationPrompt =
  "The previous response was interrupted. Continue exactly where it stopped without repeating text already produced. Answer the pending question.";

function addUsage(left: LanguageModelUsage | undefined, right: LanguageModelUsage): LanguageModelUsage {
  if (!left) return right;
  // If a request omitted a count, the combined total is unknown, not zero.
  const sum = (a: number | undefined, b: number | undefined) =>
    a === undefined || b === undefined ? undefined : a + b;
  return {
    inputTokens: sum(left.inputTokens, right.inputTokens),
    outputTokens: sum(left.outputTokens, right.outputTokens),
    totalTokens: sum(left.totalTokens, right.totalTokens),
    inputTokenDetails: {
      noCacheTokens: sum(left.inputTokenDetails.noCacheTokens, right.inputTokenDetails.noCacheTokens),
      cacheReadTokens: sum(left.inputTokenDetails.cacheReadTokens, right.inputTokenDetails.cacheReadTokens),
      cacheWriteTokens: sum(left.inputTokenDetails.cacheWriteTokens, right.inputTokenDetails.cacheWriteTokens),
    },
    outputTokenDetails: {
      textTokens: sum(left.outputTokenDetails.textTokens, right.outputTokenDetails.textTokens),
      reasoningTokens: sum(left.outputTokenDetails.reasoningTokens, right.outputTokenDetails.reasoningTokens),
    },
  };
}

export function completeWithRecovery(model: AI.RegisteredModel, request: AI.ModelRequest, apiKey: string) {
  const abort = new AbortController();
  // One deadline for the entire operation, including retries and continuations.
  const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(600000)]);

  async function* generate(): AsyncGenerator<Part> {
    let messages = [...(request.messages ?? [])];
    let usage: LanguageModelUsage | undefined;
    let toolStarted = false;
    try {
      for (let attempt = 0; attempt <= 2; attempt++) {
        signal.throwIfAborted();
        let text = "";
        let reasoning = "";
        let failure: Part | undefined;
        let finish: Extract<Part, { type: "finish" }> | undefined;
        const result = complete(model, { ...request, messages }, apiKey, {
          // The SDK retries transient request failures before streaming starts.
          // Once output exists, only the bounded continuation below may recover it.
          maxRetries: attempt === 0 ? 2 : 0,
          abortSignal: signal,
          guard: false,
        });
        for await (const part of result.fullStream) {
          signal.throwIfAborted();
          if (part.type === "error" || part.type === "abort") {
            failure = part;
            continue;
          }
          if (part.type === "finish") {
            finish = part;
            usage = addUsage(usage, part.totalUsage);
            continue;
          }
          if (part.type === "text-delta") text += part.text;
          if (part.type === "reasoning-delta") reasoning += part.text;
          // Stop recovery as soon as even partial tool information reaches Raycast.
          if (part.type.startsWith("tool-")) toolStarted = true;
          if (part.type === "start" && attempt > 0) continue;
          if (
            ["text-start", "text-delta", "text-end", "reasoning-start", "reasoning-delta", "reasoning-end"].includes(
              part.type,
            ) &&
            "id" in part
          ) {
            yield { ...part, id: `${attempt}:${part.id}` };
          } else {
            yield part;
          }
        }

        signal.throwIfAborted();
        const interrupted = !finish || (finish.finishReason === "other" && finish.rawFinishReason === undefined);
        if (interrupted && !failure && !toolStarted && text.trim() && attempt < 2) {
          const content: AI.ModelMessage["content"] = [
            ...(reasoning ? [{ type: "reasoning" as const, text: reasoning }] : []),
            { type: "text", text },
          ];
          messages = [
            ...messages,
            { role: "assistant", content },
            { role: "user", content: [{ type: "text", text: continuationPrompt }] },
          ];
          continue;
        }
        if (!failure && finish?.finishReason === "stop" && !text.trim() && !toolStarted) {
          failure = {
            type: "error",
            error: new Error("Mistral ended the response without an answer or tool call. Please retry the response."),
          };
        }
        if (failure) yield failure;
        if (finish)
          yield {
            ...finish,
            finishReason: failure ? "error" : finish.finishReason,
            totalUsage: usage ?? finish.totalUsage,
          };
        else if (!failure)
          yield {
            type: "error",
            error: new Error("Mistral's response was interrupted before completion. Please retry the response."),
          };
        return;
      }
    } finally {
      abort.abort();
    }
  }

  const iterator = generate();
  let cancelled = false;
  const stream = new ReadableStream<Part>({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (cancelled) return;
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      } catch (error) {
        if (cancelled) return;
        controller.enqueue({ type: "error", error });
        controller.close();
      }
    },
    async cancel() {
      cancelled = true;
      abort.abort();
      await iterator.return(undefined);
    },
  });
  const fullStream = stream.pipeThrough(completionGuard({ tools: {}, stopStream: () => abort.abort() })).pipeThrough(
    new TransformStream<Part, AI.ModelStreamPart>({
      transform(part, controller) {
        // These SDK-only events are outside Raycast's model-provider contract.
        // Mistral chat does not produce them; Raycast owns tool approvals.
        if (part.type !== "custom" && part.type !== "reasoning-file" && part.type !== "tool-approval-response") {
          controller.enqueue(part);
        }
      },
    }),
  );
  const reader = fullStream.getReader();
  return {
    fullStream: new ReadableStream<AI.ModelStreamPart>({
      async pull(controller) {
        const next = await reader.read();
        if (cancelled) return;
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      },
      cancel(reason) {
        cancelled = true;
        // Abort immediately, rather than waiting for cancellation to traverse the transforms.
        abort.abort(reason);
        return reader.cancel(reason);
      },
    }),
  };
}
