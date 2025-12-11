import type { ImgBedFileItem, ImgBedListResponse } from "../types/files";
import { extractTagsFromMetadata } from "./tags";

export function mapListResponse(baseUrl: string, data: ImgBedListResponse): ImgBedFileItem[] {
  return data.files.map((file) => {
    const metadata = file.metadata ?? {};
    const size = Number(metadata["File-Size"] ?? metadata["size"] ?? 0);
    const timestamp = Number(metadata["TimeStamp"] ?? metadata["timestamp"] ?? Date.now());
    const channel = metadata["Channel"] ?? metadata["channel"] ?? "";
    const mime = metadata["File-Mime"] ?? metadata["mime"] ?? "application/octet-stream";
    const tags = extractTagsFromMetadata(metadata as Record<string, unknown>);

    return {
      name: file.name,
      url: buildFileUrl(baseUrl, file.name),
      metadata: {
        channel,
        size,
        timestamp: new Date(timestamp),
        mime,
        tags,
      },
    };
  });
}

export function buildFileUrl(baseUrl: string, path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalizedBase = baseUrl.replace(/\/$/, "");
  let normalizedPath = path.replace(/^\/+/, "");
  if (!normalizedPath.toLowerCase().startsWith("file/")) {
    normalizedPath = `file/${normalizedPath}`;
  }
  return `${normalizedBase}/${normalizedPath}`;
}
