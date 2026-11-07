import { saveMedia } from "../lib/media";

type Input = {
  /**
   * A post ID or post link, such as https://x.com/NASA/status/2102882545427714266.
   */
  post: string;
};

/**
 * Save the photos and videos of 1 X post to the user's Downloads folder.
 */
export default async function tool({ post }: Input) {
  const files = await saveMedia(post);
  return { saved: files.length, files };
}
