import { addComment } from "../api/ticktick";

type Input = {
  /** Task ID */
  taskId: string;
  /** Project ID */
  projectId: string;
  /** Comment text */
  text: string;
};

/**
 * Add a comment to a TickTick task.
 */
export default async function tool(input: Input) {
  const text = input.text?.trim();
  if (!input.taskId || !input.projectId) {
    throw new Error("taskId and projectId are required.");
  }
  if (!text) throw new Error("Comment text is required.");

  const comment = await addComment(input.projectId, input.taskId, text);
  return {
    comment: {
      id: comment.id,
      title: comment.title,
      createdTime: comment.createdTime,
    },
  };
}
