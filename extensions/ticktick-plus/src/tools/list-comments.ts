import { getComments } from "../api/ticktick";

type Input = {
  /** Task ID */
  taskId: string;
  /** Project ID */
  projectId: string;
};

/**
 * List comments on a TickTick task. Call search-tasks first for IDs.
 */
export default async function tool(input: Input) {
  if (!input.taskId || !input.projectId) {
    throw new Error("taskId and projectId are required.");
  }
  const comments = await getComments(input.projectId, input.taskId);
  return {
    comments: comments.map((c) => ({
      id: c.id,
      title: c.title,
      createdTime: c.createdTime,
    })),
    count: comments.length,
  };
}
