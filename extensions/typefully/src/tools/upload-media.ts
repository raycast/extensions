import { Tool } from "@raycast/api";
import { basename } from "node:path";
import { readFile } from "node:fs/promises";
import { createMediaUpload, getMediaStatus } from "../lib/api";
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
  let file: Buffer;
  try {
    file = await readFile(input.file_path);
  } catch {
    throw new Error(`File not found: ${input.file_path}`);
  }
  const originalName = basename(input.file_path);
  const extensionIndex = originalName.lastIndexOf(".");
  const stem = extensionIndex >= 0 ? originalName.slice(0, extensionIndex) : originalName;
  const extension = extensionIndex >= 0 ? originalName.slice(extensionIndex).toLowerCase() : "";
  const fileName = `${stem.replace(/[^a-zA-Z0-9_.()-]/g, "_").replace(/_+/g, "_") || "upload"}${extension}`;
  const upload = await createMediaUpload(socialSetId, fileName);
  const response = await fetch(upload.upload_url, { method: "PUT", body: file });
  if (!response.ok) throw new Error(`Media upload failed with status ${response.status}`);

  for (let attempt = 0; attempt < 30; attempt++) {
    const status = await getMediaStatus(socialSetId, upload.media_id);
    if (status.status === "ready") return status;
    if (status.status === "error" || status.status === "failed")
      throw new Error("Typefully failed to process the media.");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return { media_id: upload.media_id, status: "processing" };
}
