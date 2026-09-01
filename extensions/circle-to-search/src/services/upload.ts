import { readFileSync } from "fs";
import { basename } from "path";

/**
 * Uploads an image to Catbox.moe (Fast, free, reliable, no API key needed).
 */
async function uploadToCatbox(filePath: string): Promise<string> {
  const fileBuffer = readFileSync(filePath);
  const fileName = basename(filePath);
  const blob = new Blob([fileBuffer], { type: "image/png" });

  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", blob, fileName);

  const response = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Catbox returned HTTP ${response.status}`);
  }

  const url = (await response.text()).trim();
  if (!url.startsWith("http")) {
    throw new Error(`Catbox response invalid: ${url}`);
  }

  return url;
}

/**
 * Uploads an image to TmpFiles.org (Ephemeral, no registration needed).
 */
async function uploadToTmpFiles(filePath: string): Promise<string> {
  const fileBuffer = readFileSync(filePath);
  const fileName = basename(filePath);
  const blob = new Blob([fileBuffer], { type: "image/png" });

  const form = new FormData();
  form.append("file", blob, fileName);

  const response = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`TmpFiles returned HTTP ${response.status}`);
  }

  const json = (await response.json()) as { status: string; data?: { url?: string } };
  if (json.status === "success" && json.data?.url) {
    // TmpFiles returns page URL like https://tmpfiles.org/123/img.png
    // The direct image URL format is https://tmpfiles.org/dl/123/img.png
    const pageUrl = json.data.url;
    return pageUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
  }

  throw new Error(`Unexpected TmpFiles response format: ${JSON.stringify(json)}`);
}

/**
 * Resilient multi-host uploader:
 * Tries the primary host (Catbox) first. If it fails or times out,
 * transparently falls back to TmpFiles so image searches never fail.
 */
export async function uploadImage(filePath: string): Promise<string> {
  try {
    return await uploadToCatbox(filePath);
  } catch (primaryErr) {
    console.warn("Primary upload failed, falling back to backup host:", primaryErr);
    return await uploadToTmpFiles(filePath);
  }
}
