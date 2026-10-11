import { Tool } from "@raycast/api";
import { startHfDownload } from "../lib/omlx";

type Input = {
  /** The HuggingFace repo ID to download (e.g. "mlx-community/Qwen3-8B-4bit"). Use search-models to find repo IDs. */
  repoId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Download this model?`,
  info: [{ name: "Model", value: input.repoId }],
});

export default async function (input: Input) {
  const task = await startHfDownload(input.repoId);
  return {
    success: true,
    taskId: task.task_id,
    repoId: input.repoId,
    message: `Download started for ${input.repoId}`,
  };
}
