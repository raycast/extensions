import { basename } from "node:path";
import { readFile } from "node:fs/promises";
import { createMediaUpload, getMediaStatus } from "./api";

export async function uploadMedia(socialSetId: number, filePath: string) {
  const file = await readFile(filePath);
  const originalName = basename(filePath);
  const extensionIndex = originalName.lastIndexOf(".");
  const stem = extensionIndex >= 0 ? originalName.slice(0, extensionIndex) : originalName;
  const extension = extensionIndex >= 0 ? originalName.slice(extensionIndex).toLowerCase() : "";
  const fileName = `${
    stem
      .replace(/[^a-zA-Z0-9_.()-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 240) || "upload"
  }${extension}`;
  const upload = await createMediaUpload(socialSetId, fileName);
  // Presigned uploads must contain only raw bytes, without auth or content-type headers.
  const response = await fetch(upload.upload_url, { method: "PUT", body: file });
  if (!response.ok) throw new Error(`Media upload failed with status ${response.status}`);

  for (let attempt = 0; attempt < 30; attempt++) {
    const status = await getMediaStatus(socialSetId, upload.media_id);
    if (status.status === "ready") return status;
    if (status.status === "error" || status.status === "failed") {
      throw new Error("Typefully failed to process the media.");
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return { media_id: upload.media_id, status: "processing" };
}
