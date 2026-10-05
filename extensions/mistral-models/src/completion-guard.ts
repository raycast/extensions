import type { StreamTextTransform, ToolSet } from "ai";

/** Never report a truncated or reasoning-only response as a completed answer. */
export const completionGuard: StreamTextTransform<ToolSet> = () => {
  let hasAnswer = false;
  let hasToolCall = false;
  let failed = false;
  return new TransformStream({
    transform(part, controller) {
      if (part.type === "text-delta" && part.text.trim()) hasAnswer = true;
      if (part.type === "tool-call") hasToolCall = true;
      if (part.type === "error" || part.type === "abort") failed = true;
      if (part.type === "finish" && !failed) {
        let message: string | undefined;
        if (part.finishReason === "other") {
          message = "Mistral's response was interrupted or ended unexpectedly. Please retry the response.";
        } else if (part.finishReason === "length") {
          message = "Mistral reached its token limit before completing the answer. Try a shorter prompt or a new chat.";
        } else if (part.finishReason === "stop" && !hasAnswer && !hasToolCall) {
          message = "Mistral ended the response without an answer or tool call. Please retry the response.";
        }
        if (message) {
          controller.enqueue({ type: "error", error: new Error(message) });
          controller.enqueue({ ...part, finishReason: "error" });
          return;
        }
      }
      controller.enqueue(part);
    },
  });
};
