import { Action, Tool } from "@raycast/api";
import { deleteComment } from "../api/ticktick";

type Input = {
  /** Task ID */
  taskId: string;
  /** Project ID */
  projectId: string;
  /** Comment ID from list-comments */
  commentId: string;
  /** Optional comment text for confirmation */
  text?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: Action.Style.Destructive,
  message: "Delete this comment?",
  info: [{ name: "Comment", value: input.text ?? input.commentId }],
});

/**
 * Delete a comment from a TickTick task. Always asks for confirmation.
 */
export default async function tool(input: Input) {
  if (!input.taskId || !input.projectId || !input.commentId) {
    throw new Error("taskId, projectId, and commentId are required.");
  }
  await deleteComment(input.projectId, input.taskId, input.commentId);
  return { deleted: { commentId: input.commentId, taskId: input.taskId } };
}
