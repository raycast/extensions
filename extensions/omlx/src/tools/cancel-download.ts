import { Tool } from "@raycast/api";
import { cancelHfDownload } from "../lib/omlx";

type Input = {
  /** The task ID of the download to cancel. Use get-download-progress to find task IDs. */
  taskId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Cancel this download?`,
  info: [{ name: "Task ID", value: input.taskId }],
});

export default async function (input: Input) {
  await cancelHfDownload(input.taskId);
  return { success: true, taskId: input.taskId, message: "Download cancelled" };
}
