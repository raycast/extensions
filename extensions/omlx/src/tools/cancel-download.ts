import { Tool } from "@raycast/api";
import { cancelHfDownload, cancelMsDownload } from "../lib/omlx";

type Input = {
  /** The task ID of the download to cancel. Use get-download-progress to find task IDs. */
  taskId: string;
  /** Where the download runs: "huggingface" or "modelscope". Defaults to "huggingface". Copy it from get-download-progress. */
  source?: "huggingface" | "modelscope";
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Cancel this download?`,
  info: [
    { name: "Task ID", value: input.taskId },
    ...(input.source ? [{ name: "Source", value: input.source }] : []),
  ],
});

export default async function (input: Input) {
  // oMLX runs separate downloaders per source; route to the right one.
  // Default to HuggingFace so pre-source callers keep working.
  if (input.source === "modelscope") {
    await cancelMsDownload(input.taskId);
  } else {
    await cancelHfDownload(input.taskId);
  }
  return {
    success: true,
    taskId: input.taskId,
    source: input.source ?? "huggingface",
    message: "Download cancelled",
  };
}
