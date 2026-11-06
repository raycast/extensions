import type { IncomingMessage } from "node:http";
import { GhosthandError, isRecord, problemError } from "./errors";
import { readEvents } from "./sse";
import { parseJSON, readBody } from "./transport";
import type { TaskResult, TaskUpdate } from "./types";

export async function readTaskResponse(
  response: IncomingMessage,
  onUpdate: (update: TaskUpdate) => void,
): Promise<TaskResult> {
  if (!response.headers["content-type"]?.includes("text/event-stream")) {
    const value = parseJSON<unknown>(await readBody(response));
    if (isRecord(value) && typeof value.code === "string") throw problemError(value);
    if (!isRecord(value) || typeof value.task !== "string" || typeof value.text !== "string") {
      throw new GhosthandError("invalid-response", "Ghosthand did not return a task result. The outcome is unknown.");
    }
    onUpdate({ text: value.text, progress: "Task completed" });
    return { task: value.task, text: value.text };
  }

  let text = "";
  let separateTextBlock = false;
  let finished = false;
  const task = response.headers["ghosthand-task"];
  try {
    for await (const event of readEvents(response)) {
      if (event.data === "[DONE]") {
        if (!finished)
          throw new GhosthandError(
            "task-incomplete",
            "The task ended without confirming completion. Inspect the iPhone.",
          );
        return { task: typeof task === "string" ? task : "", text };
      }
      let chunk: unknown;
      try {
        chunk = JSON.parse(event.data);
      } catch {
        throw new GhosthandError("invalid-stream", "Ghosthand sent an unreadable task event. The outcome is unknown.");
      }
      if (!isRecord(chunk)) throw new GhosthandError("invalid-stream", "Ghosthand sent an invalid task event.");
      if (event.event === "error" || typeof chunk.code === "string") throw problemError(chunk);
      switch (chunk.type) {
        case "error":
          throw new GhosthandError(
            "task-failed",
            typeof chunk.errorText === "string" ? chunk.errorText : "Ghosthand's hosted task failed.",
          );
        case "abort":
          throw new GhosthandError(
            "cancelled",
            "Ghosthand stopped the task. Actions already performed are not undone.",
          );
        case "text-start":
          separateTextBlock = text.length > 0;
          break;
        case "text-delta":
          if (typeof chunk.delta !== "string")
            throw new GhosthandError("invalid-stream", "The task contained invalid text.");
          if (chunk.delta && separateTextBlock) {
            text += "\n\n";
            separateTextBlock = false;
          }
          text += chunk.delta;
          if (text.length > 1_000_000)
            throw new GhosthandError("invalid-stream", "The task response exceeded the supported size.");
          onUpdate({ text, progress: "Receiving response" });
          break;
        case "tool-input-available":
          onUpdate({
            text,
            progress: typeof chunk.toolName === "string" ? `Running ${chunk.toolName}` : "Working on the iPhone",
          });
          break;
        case "tool-output-available":
          onUpdate({ text, progress: "Received phone operation result" });
          break;
        case "tool-output-error":
          onUpdate({ text, progress: "A phone operation failed; waiting for the agent's response" });
          break;
        case "start":
        case "start-step":
          onUpdate({ text, progress: "Ghosthand is working on the iPhone" });
          break;
        case "finish":
          if (chunk.finishReason && chunk.finishReason !== "stop") {
            throw new GhosthandError(
              "task-incomplete",
              `The task ended with reason: ${String(chunk.finishReason)}. Inspect the iPhone.`,
            );
          }
          finished = true;
          break;
      }
    }
    throw new GhosthandError(
      "task-incomplete",
      "The task stream closed before completion was confirmed. Inspect the iPhone before retrying.",
    );
  } finally {
    response.destroy();
  }
}
