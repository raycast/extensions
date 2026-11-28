import { Tool } from "@raycast/api";
import { basename } from "node:path";
import { uploadMedia } from "../lib/media";
import { resolveToolSocialSetId } from "../lib/tool-helpers";

type Input = {
  /** Absolute local file path. */
  file_path: string;
  social_set_id?: number;
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Upload ${basename(input.file_path)} to Typefully?`,
});
export default async function tool(input: Input) {
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  return uploadMedia(socialSetId, input.file_path);
}
