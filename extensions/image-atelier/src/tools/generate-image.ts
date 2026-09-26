import { getConfig } from "../lib/config";
import { createImage } from "../lib/images";
type Input = {
  /** Full description of the image to generate. */
  prompt: string;
  /** Optional provider-supported size, such as 1024x1024, 1536x1024, or 1024x1536. Omit to use provider default. */
  size?: string;
  /** Optional provider-supported quality, such as low, medium, high, or auto. Omit to use provider default. */
  quality?: string;
};
export default async function tool(input: Input) {
  return createImage(await getConfig(), input);
}
