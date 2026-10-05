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

/**
 * Resolve the comment against the task's synced comments. A comment ID that is not
 * found cannot be described honestly in the confirmation, so refuse it instead of
 * deleting an unknown comment.
 */
async function resolveComment(input: Input): Promise<string> {
  if (!input.taskId || !input.projectId || !input.commentId) {
    throw new Error("taskId, projectId, and commentId are required.");
  }
  const comments = await getComments(input.projectId, input.taskId);
  const found = comments.find((c) => c.id === input.commentId);
  if (!found) {
    throw new Error(`Comment "${input.commentId}" not found. Call list-comments and retry with a current commentId.`);
  }
  return found.title;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const label = await resolveComment(input);
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
  await resolveComment(input);
  await deleteComment(input.projectId, input.taskId, input.commentId);
  return { deleted: { commentId: input.commentId, taskId: input.taskId } };
}
