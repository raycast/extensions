import { Action, Tool } from "@raycast/api";
import { deletePost } from "../utils/buffer-api";

type Input = {
  /**
   * Exact Buffer post ID to delete.
   */
  postId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Destructive,
    message: "Delete this Buffer post?",
    info: [{ name: "Post ID", value: input.postId }],
  };
};

/**
 * Delete a Buffer post by its exact post ID.
 */
export default async function tool(input: Input) {
  await deletePost(input.postId);

  return {
    success: true,
    message: `Post ${input.postId} was deleted from Buffer.`,
  };
}
