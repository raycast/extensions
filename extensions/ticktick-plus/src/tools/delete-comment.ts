import { Action, Tool } from "@raycast/api";
import { deleteComment, getComments } from "../api/ticktick";

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

async function resolveCommentLabel(input: Input): Promise<string> {
  if (!input.projectId || !input.taskId || !input.commentId) {
    return input.commentId || "?";
  }
  const comments = await getComments(input.projectId, input.taskId);
  const found = comments.find((c) => c.id === input.commentId);
  return found?.title ?? input.commentId;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const label = await resolveCommentLabel(input);
  return {
    style: Action.Style.Destructive,
    message: "Delete this comment?",
    info: [{ name: "Comment", value: label }],
  };
};

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
