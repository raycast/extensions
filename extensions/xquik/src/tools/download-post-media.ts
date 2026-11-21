import { Tool } from "@raycast/api";
import { saveMedia } from "../lib/media";

type Input = {
  /**
   * A post ID or post link, such as https://x.com/NASA/status/2102882545427714266.
   */
  post: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ post }) => ({
  message: "Save the photos & videos of this post to your Downloads folder?",
  info: [{ name: "Post", value: post }],
});

/**
 * Save the photos and videos of 1 X post to the user's Downloads folder.
 */
export default async function tool({ post }: Input) {
  const files = await saveMedia(post);
  return { saved: files.length, files };
}
