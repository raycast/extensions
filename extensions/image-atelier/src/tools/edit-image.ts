import { Tool } from "@raycast/api";
import { isAbsolute } from "node:path";
import { getConfig } from "../lib/config";
import { createImage, endpoint } from "../lib/images";
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
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!isAbsolute(input.imagePath))
    throw new Error("Reference image must be an absolute local file path.");
  const config = await getConfig();
  return {
    message: "Upload this local photo to your image provider for editing?",
    info: [
      { name: "Photo", value: input.imagePath },
      { name: "Destination", value: endpoint(config.baseUrl, true) },
      { name: "Model", value: config.model },
      { name: "Edit instructions", value: input.prompt },
    ],
  };
};
export default async function tool(input: Input) {
  return createImage(await getConfig(), input);
}
