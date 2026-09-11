import { getConfig } from "../lib/config";
import { createImage } from "../lib/images";
type Input = {
  /** Instructions describing what to change and what to preserve. */
  prompt: string;
  /** Absolute local PNG, JPEG, or WebP file path supplied by the user or returned by a previous image tool. Never invent a path. */
  imagePath: string;
  /** Optional provider-supported output size. */
  size?: string;
  /** Optional provider-supported quality. */
  quality?: string;
};
export default async function tool(input: Input) {
  return createImage(await getConfig(), input);
}
