import { listUploads } from "../api/client";
import { formatBytes } from "../lib/format";
import { cleanText } from "../lib/markdown";
import { findDestination } from "../lib/destinations";

type Input = {
  /**
   * Text to look for in the file name or object key, e.g. "invoice" or "png".
   * Leave empty to get the most recent uploads.
   */
  query?: string;
  /** Only search uploads to this destination (its exact name or bucket). Leave empty for all destinations. */
  destination?: string;
  /** How many uploads to return at most. Defaults to 20. */
  limit?: number;
};

/**
 * Search the files the user uploaded with Aktar, newest first. Returns each
 * file's public link along with ready-to-paste Markdown.
 */
export default async function tool(input: Input) {
  const destination = input.destination ? await findDestination(input.destination) : undefined;
  const uploads = await listUploads({
    query: input.query?.trim() || undefined,
    destinationId: destination?.id,
    limit: Math.min(Math.max(input.limit ?? 20, 1), 100),
  });
  return {
    count: uploads.length,
    uploads: uploads.map((upload) => ({
      filename: cleanText(upload.filename),
      /** Exact object key: pass it back to other tools as it is. */
      key: upload.objectKey,
      url: upload.url,
      markdown: upload.formats.markdown,
      destination: upload.destinationName,
      size: formatBytes(upload.size),
      uploadedAt: upload.createdAt,
      /** When Aktar auto-deletes the file, or null if it's kept forever. */
      expiresAt: upload.expiresAt ?? null,
    })),
  };
}
