import { environment } from "@raycast/api";
import { mkdir, rename, stat, writeFile } from "fs/promises";
import path from "path";
import { getApiConfig } from "./config";

const IMAGE_EXTENSIONS = ["jpg", "png", "gif", "webp", "img"];

function extensionFromContentType(contentType: string) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("webp")) return "webp";
  return "img";
}

export async function getScreenshot(id: string) {
  const { apiUrl, apiKey } = await getApiConfig();
  const encodedUrl = encodeURIComponent(`/api/assets/${id}`);
  const imageUrl = `${apiUrl}/_next/image?url=${encodedUrl}&w=1200&q=75`;
  const imageCacheDirectory = path.join(environment.supportPath, "preview-images");

  await mkdir(imageCacheDirectory, { recursive: true });

  for (const extension of IMAGE_EXTENSIONS) {
    const cachedPath = path.join(imageCacheDirectory, `${id}.${extension}`);
    try {
      const cached = await stat(cachedPath);
      if (cached.size > 0) return cachedPath;
    } catch {
      // cache miss
    }
  }

  const response = await fetch(imageUrl, {
    headers: {
      Accept: "image/png,image/jpeg;q=0.9,*/*;q=0.1",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Expected image response, got ${contentType}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const extension = extensionFromContentType(contentType);
  const imagePath = path.join(imageCacheDirectory, `${id}.${extension}`);
  const temporaryPath = `${imagePath}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;

  await writeFile(temporaryPath, bytes);
  await rename(temporaryPath, imagePath);
  return imagePath;
}
