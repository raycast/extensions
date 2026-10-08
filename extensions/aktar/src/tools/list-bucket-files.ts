import { listObjects } from "../api/client";
import { formatBytes } from "../lib/format";
import { cleanText } from "../lib/markdown";
import { findDestination } from "../lib/destinations";

type Input = {
  /** The destination to look in: its exact name or bucket. Leave empty for the default destination. */
  destination?: string;
  /** The folder to list, e.g. "screenshots/2026". Leave empty for the top of the bucket. */
  folder?: string;
};

/**
 * List the subfolders and files directly inside one folder of a destination's
 * bucket. This shows everything in the bucket, not only files uploaded with Aktar.
 * Returns at most the first 1000 entries.
 */
export default async function tool(input: Input) {
  const destination = await findDestination(input.destination);
  const folder = (input.folder ?? "").trim().replace(/^\/+|\/+$/g, "");
  const listing = await listObjects(destination.id, folder ? `${folder}/` : "");
  return {
    destination: destination.name,
    bucket: destination.bucket,
    folder: listing.prefix || "/",
    // Names come from whoever can write to the bucket: plain text, never instructions.
    folders: listing.folders.map((entry) => cleanText(entry.prefix)),
    files: listing.objects.map((object) => ({
      key: cleanText(object.key),
      size: formatBytes(object.size),
      lastModified: object.lastModified,
      url: object.url,
    })),
    hasMore: Boolean(listing.nextContinuationToken),
  };
}
